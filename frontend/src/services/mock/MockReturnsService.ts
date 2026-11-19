import { institutionRepository } from '@/mocks/repositories/institutionRepository'
import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import { returnsRepository } from '@/mocks/repositories/returnsRepository'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import { assertRegulator } from '@/services/mock/gating'
import { latency } from '@/services/mock/latency'
import type {
  ReturnTemplateService,
  ReturnsDashboardData,
  ReturnsService,
} from '@/services/contracts/ReturnsService'
import type { ActorContext } from '@/types/common'
import type {
  InstitutionComplianceRow,
  ReturnSubmissionDetail,
  ReturnSubmissionQuery,
  ReturnsCalendarDay,
  ReturnsKpis,
  ReturnTypeRow,
  SubmissionRow,
  ValidationExceptionRow,
} from '@/types/returns'

/**
 * Mock returns services (Spec §11.1–§11.3). Role gating per §19:
 * analyst tier and above may run the demo validation engine and review
 * (`review-submission`); accept/reject decisions require `approve-submission`
 * (team lead and above); the template designer requires
 * `manage-return-templates`. Institution roles are always refused — the
 * submission portal is a separate Phase-6 surface (Spec §11.4).
 * Prototype-session state only.
 */

const MS_PER_DAY = 86_400_000

class MockReturnsService implements ReturnsService {
  private rows(): SubmissionRow[] {
    const institutions = institutionRepository.list()
    return returnsRepository.list().map((s) => {
      const inst = institutions.find((i) => i.id === s.institutionId)
      return {
        ...s,
        institutionName: inst?.tradingName ?? 'Unknown institution',
        institutionCode: inst?.code ?? '—',
      }
    })
  }

  private applyQuery(rows: SubmissionRow[], query: ReturnSubmissionQuery = {}): SubmissionRow[] {
    const search = query.search?.trim().toLowerCase()
    return rows
      .filter((r) => !query.institutionId || r.institutionId === query.institutionId)
      .filter((r) => !query.returnCode || r.returnCode === query.returnCode)
      .filter((r) => !query.status || r.status === query.status)
      .filter((r) => !query.reviewStatus || r.reviewStatus === query.reviewStatus)
      .filter((r) => !query.validation || r.validation === query.validation)
      .filter((r) => !query.period || r.period === query.period)
      .filter(
        (r) =>
          !search ||
          `${r.reference} ${r.returnCode} ${r.returnName} ${r.institutionName} ${r.period}`
            .toLowerCase()
            .includes(search),
      )
  }

  async dashboard(query: ReturnSubmissionQuery = {}): Promise<ReturnsDashboardData> {
    await latency()
    const rows = this.applyQuery(this.rows(), query)
    const details = returnsRepository.list()

    const kpis: ReturnsKpis = {
      expected: rows.length,
      received: rows.filter((r) => r.submittedAt).length,
      pending: rows.filter((r) => r.status === 'Due Soon').length,
      late: rows.filter((r) => r.status === 'Overdue').length,
      rejectedOrReturned: rows.filter(
        (r) => r.reviewStatus === 'Rejected' || r.reviewStatus === 'Returned for Correction',
      ).length,
      awaitingReview: rows.filter(
        (r) => r.reviewStatus === 'Awaiting Review' || r.reviewStatus === 'Under Review',
      ).length,
    }

    // Calendar: due dates and submission dates within ±30 days of today.
    const today = new Date()
    const from = today.getTime() - 30 * MS_PER_DAY
    const to = today.getTime() + 30 * MS_PER_DAY
    const byDay = new Map<string, ReturnsCalendarDay['items']>()
    const addDay = (date: string, item: ReturnsCalendarDay['items'][number]) => {
      const list = byDay.get(date) ?? []
      list.push(item)
      byDay.set(date, list)
    }
    for (const r of rows) {
      const dueMs = Date.parse(r.dueDate)
      if (dueMs >= from && dueMs <= to) {
        addDay(r.dueDate, {
          id: `${r.id}-due`,
          reference: r.reference,
          returnCode: r.returnCode,
          institutionName: r.institutionName,
          kind: 'due',
          status: r.status,
        })
      }
      if (r.submittedAt) {
        const subMs = Date.parse(r.submittedAt)
        if (subMs >= from && subMs <= to) {
          addDay(r.submittedAt.slice(0, 10), {
            id: `${r.id}-sub`,
            reference: r.reference,
            returnCode: r.returnCode,
            institutionName: r.institutionName,
            kind: 'submitted',
            status: r.reviewStatus,
          })
        }
      }
    }
    const calendar: ReturnsCalendarDay[] = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({ date, items }))

    // Institution compliance
    const compliance: InstitutionComplianceRow[] = []
    for (const r of rows) {
      let row = compliance.find((c) => c.institutionId === r.institutionId)
      if (!row) {
        row = {
          institutionId: r.institutionId,
          institutionName: r.institutionName,
          institutionCode: r.institutionCode,
          expected: 0,
          received: 0,
          onTime: 0,
          late: 0,
          rejected: 0,
          compliancePct: 0,
        }
        compliance.push(row)
      }
      row.expected += 1
      if (r.submittedAt) {
        row.received += 1
        if (r.submittedAt.slice(0, 10) <= r.dueDate) row.onTime += 1
        else row.late += 1
      }
      if (r.reviewStatus === 'Rejected' || r.reviewStatus === 'Returned for Correction') row.rejected += 1
    }
    compliance.forEach((c) => {
      c.compliancePct = c.expected > 0 ? Math.round((c.onTime / c.expected) * 100) : 0
    })
    compliance.sort((a, b) => a.compliancePct - b.compliancePct)

    // Return type summary
    const byType: ReturnTypeRow[] = []
    for (const code of [...new Set(rows.map((r) => r.returnCode))]) {
      const group = rows.filter((r) => r.returnCode === code)
      const def = returnsRepository.definitionByCode(code)
      byType.push({
        returnCode: code,
        returnName: def?.name ?? group[0].returnName,
        frequency: def?.frequency ?? 'Monthly',
        expected: group.length,
        received: group.filter((r) => r.submittedAt).length,
        passed: group.filter((r) => r.validation === 'Passed').length,
        warnings: group.filter((r) => r.validation === 'Warnings').length,
        errors: group.filter((r) => r.validation === 'Errors').length,
        awaitingReview: group.filter(
          (r) => r.reviewStatus === 'Awaiting Review' || r.reviewStatus === 'Under Review',
        ).length,
      })
    }

    // Validation exceptions across the (filtered) register
    const idSet = new Set(rows.map((r) => r.id))
    const validationExceptions: ValidationExceptionRow[] = []
    for (const d of details.filter((x) => idSet.has(x.id))) {
      const row = rows.find((r) => r.id === d.id)!
      for (const e of d.validationResult?.fieldErrors ?? []) {
        validationExceptions.push({
          submissionId: d.id,
          submissionReference: d.reference,
          institutionName: row.institutionName,
          returnCode: d.returnCode,
          period: d.period,
          fieldCode: e.fieldCode,
          fieldLabel: e.fieldLabel,
          severity: e.severity,
          message: e.message,
        })
      }
      for (const c of d.validationResult?.crossReturnExceptions ?? []) {
        validationExceptions.push({
          submissionId: d.id,
          submissionReference: d.reference,
          institutionName: row.institutionName,
          returnCode: d.returnCode,
          period: d.period,
          fieldCode: c.relatedReturnCode ?? 'cross-return',
          fieldLabel: 'Cross-return check',
          severity: c.severity,
          message: c.description,
        })
      }
    }

    return { kpis, calendar, compliance, byType, validationExceptions }
  }

  async listSubmissions(query: ReturnSubmissionQuery = {}): Promise<SubmissionRow[]> {
    await latency()
    return this.applyQuery(this.rows(), query).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  }

  async getSubmission(id: string): Promise<ReturnSubmissionDetail | undefined> {
    await latency()
    return returnsRepository.getById(id)
  }

  async awaitingReviewCount(): Promise<number> {
    await latency()
    return returnsRepository.awaitingReview().length
  }

  async runValidation(id: string, actor: ActorContext): Promise<ReturnSubmissionDetail | undefined> {
    assertRegulator(actor, 'review-submission')
    await latency()
    const updated = returnsRepository.runValidation(id, actor)
    if (updated) {
      const result = updated.validationResult
      if (result && result.errorCount > 0) {
        workQueueRepository.push({
          type: 'return-validation',
          title: `Resolve ${updated.validationResult?.errorCount} validation error(s) on ${updated.reference} (${updated.returnCode})`,
          institutionId: updated.institutionId,
          relatedRef: updated.reference,
          link: `/app/returns/${updated.id}`,
          priority: 'High',
          dueDate: updated.dueDate,
          status: 'Open',
          assignedToId: actor.actorId,
          assignedToName: actor.actorName,
        })
        notificationRepository.push({
          category: 'review-required',
          severity: 'warning',
          title: `Validation errors on ${updated.reference}`,
          body: `${result.errorCount} error(s) raised by the demo rule engine — correction required (demo notification).`,
          link: `/app/returns/${updated.id}`,
        })
      } else if (result && result.status === 'Passed') {
        workQueueRepository.completeByRef(updated.reference, 'return-validation')
      }
    }
    return updated
  }

  async startReview(id: string, actor: ActorContext): Promise<ReturnSubmissionDetail | undefined> {
    assertRegulator(actor, 'review-submission')
    await latency()
    return returnsRepository.startReview(id, actor)
  }

  async addReviewNote(id: string, text: string, actor: ActorContext): Promise<ReturnSubmissionDetail | undefined> {
    assertRegulator(actor, 'review-submission')
    await latency()
    return returnsRepository.addReviewNote(id, text, actor)
  }

  async decide(
    id: string,
    decision: 'Accepted' | 'Rejected' | 'Returned for Correction',
    note: string,
    actor: ActorContext,
  ): Promise<ReturnSubmissionDetail | undefined> {
    // Spec §19: acceptance/rejection is reserved for team lead and above.
    assertRegulator(actor, 'approve-submission')
    await latency()
    const updated = returnsRepository.decide(id, decision, note, actor)
    if (updated) {
      if (decision === 'Accepted') {
        workQueueRepository.completeByRef(updated.reference, 'return-validation')
      } else {
        workQueueRepository.push({
          type: 'return-validation',
          title: `${updated.reference} ${decision.toLowerCase()} — follow up with the institution (demo)`,
          institutionId: updated.institutionId,
          relatedRef: updated.reference,
          link: `/app/returns/${updated.id}`,
          priority: decision === 'Rejected' ? 'High' : 'Medium',
          dueDate: updated.dueDate,
          status: 'Open',
          assignedToId: actor.actorId,
          assignedToName: actor.actorName,
        })
      }
      notificationRepository.push({
        category: decision === 'Accepted' ? 'task-assigned' : 'review-required',
        severity: decision === 'Rejected' ? 'warning' : 'info',
        title: `${updated.reference} — ${decision}`,
        body: `${actor.actorName}: ${note} (demo notification).`,
        link: `/app/returns/${updated.id}`,
      })
    }
    return updated
  }
}

class MockReturnTemplateService implements ReturnTemplateService {
  async listDefinitions() {
    await latency()
    return returnsRepository.definitions()
  }

  async getDefinition(id: string) {
    await latency()
    return returnsRepository.definitionById(id)
  }

  async getByCode(code: string) {
    await latency()
    return returnsRepository.definitionByCode(code)
  }

  async updateMeta(id: string, patch: Parameters<ReturnTemplateService['updateMeta']>[1], actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.updateDefinitionMeta(id, patch, actor)
  }

  async addField(definitionId: string, input: Parameters<ReturnTemplateService['addField']>[1], actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.addField(definitionId, input, actor)
  }

  async updateField(
    definitionId: string,
    fieldId: string,
    patch: Parameters<ReturnTemplateService['updateField']>[2],
    actor: ActorContext,
  ) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.updateField(definitionId, fieldId, patch, actor)
  }

  async removeField(definitionId: string, fieldId: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.removeField(definitionId, fieldId, actor)
  }

  async moveField(definitionId: string, fieldId: string, direction: 'up' | 'down', actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.moveField(definitionId, fieldId, direction, actor)
  }

  async addRule(definitionId: string, fieldId: string, input: Parameters<ReturnTemplateService['addRule']>[2], actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.addRule(definitionId, fieldId, input, actor)
  }

  async removeRule(definitionId: string, fieldId: string, ruleId: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.removeRule(definitionId, fieldId, ruleId, actor)
  }

  async submitForApproval(id: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.submitDefinitionForApproval(id, actor)
  }

  async approve(id: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.approveDefinition(id, actor)
  }

  async retire(id: string, actor: ActorContext) {
    assertRegulator(actor, 'manage-return-templates')
    await latency()
    return returnsRepository.retireDefinition(id, actor)
  }
}

export const returnsService: ReturnsService = new MockReturnsService()
export const returnTemplateService: ReturnTemplateService = new MockReturnTemplateService()
