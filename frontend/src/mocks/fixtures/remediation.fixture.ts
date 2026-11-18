/**
 * Remediation detail fixtures (Spec §7.8): milestones, institution updates,
 * evidence links, validation, extension requests, escalations and closure
 * state for the Phase-2A corrective actions. Anchored to the story-world:
 * CAP-2026-003 overdue with a pending extension request and escalation to
 * ENF-2026-001; CAP-2026-005 validated and awaiting the closure decision.
 * Demo data only.
 */
import { demoUuid, isoDay, isoDateTime } from '@/mocks/fixtures/demoIds'
import { CORRECTIVE_ACTIONS } from '@/mocks/fixtures/supervision.fixture'
import type { CorrectiveActionDetail } from '@/types/finding'

interface CapSeed {
  agreedPlan: string
  findingRef: string
  validationStatus: CorrectiveActionDetail['validationStatus']
  milestones: Array<{ label: string; targetOffsetDays: number; done: boolean; doneOffsetDays?: number }>
  updates: Array<{ offsetDays: number; authorName: string; text: string; progressPct?: number }>
  evidenceRefs: string[]
  extensions?: Array<{
    requestedOffsetDays: number
    requestedByName: string
    newDueOffsetDays: number
    reason: string
    status: 'Pending' | 'Approved' | 'Rejected'
    decidedByName?: string
    decidedOffsetDays?: number
    decisionNote?: string
  }>
  escalations?: Array<{ offsetDays: number; byName: string; level: string; note: string }>
  closure?: CorrectiveActionDetail['closure']
}

const SEEDS: Record<string, CapSeed> = {
  'CAP-2026-003': {
    agreedPlan:
      'Re-tune transaction monitoring rules to cover the structured-deposit typology; reinstate the AML tuning committee with minuted quarterly meetings; back-test the Jan–Sep 2026 sample period for missed STRs; deliver a closure evidence pack. Agreed with Meridian management under FND-2026-101 (demo plan).',
    findingRef: 'FND-2026-101',
    validationStatus: 'Validation Failed',
    milestones: [
      { label: 'Rule-tuning gap analysis signed off', targetOffsetDays: -45, done: true, doneOffsetDays: -47 },
      { label: 'Re-tuned rules deployed to production', targetOffsetDays: -20, done: true, doneOffsetDays: -18 },
      { label: 'Tuning committee reinstated with minuted meeting', targetOffsetDays: -14, done: false },
      { label: 'Back-test report for missed STRs delivered', targetOffsetDays: -14, done: false },
      { label: 'Closure evidence pack submitted', targetOffsetDays: -7, done: false },
    ],
    updates: [
      { offsetDays: -30, authorName: 'Grace Mbeki (Meridian — institution portal)', text: 'Re-tuned rules passed UAT; deployment scheduled. Demo update.', progressPct: 45 },
      { offsetDays: -16, authorName: 'Grace Mbeki (Meridian — institution portal)', text: 'Rules deployed. Committee reinstatement delayed by board calendar; back-test 60% complete. Demo update.', progressPct: 65 },
    ],
    evidenceRefs: ['EV-2026-110'],
    extensions: [
      {
        requestedOffsetDays: -10,
        requestedByName: 'Grace Mbeki (Meridian — institution portal)',
        newDueOffsetDays: 21,
        reason: 'Board calendar delays for committee reinstatement; back-test population larger than estimated (demo reason).',
        status: 'Pending',
      },
    ],
    escalations: [
      { offsetDays: -14, byName: 'Hauwa Sadiq', level: 'Level 1 — supervisory team lead', note: 'Due date passed with milestones outstanding; team lead notified (demo).' },
      { offsetDays: -10, byName: 'Zainab Lawal', level: 'Level 2 — enforcement referral', note: 'Referred to enforcement; case ENF-2026-001 opened and directive DIR-2026-004 issued (demo).' },
    ],
  },
  'CAP-2026-002': {
    agreedPlan:
      'Automate daily liquidity return submission (straight-through feed); interim dual-control submission checklist; monthly timeliness reporting to ALCO until three clean months are achieved. Agreed under FND-2026-087 (demo plan).',
    findingRef: 'FND-2026-087',
    validationStatus: 'Under Validation',
    milestones: [
      { label: 'Dual-control checklist in operation', targetOffsetDays: -30, done: true, doneOffsetDays: -32 },
      { label: 'Automation project funded and vendor selected', targetOffsetDays: -14, done: true, doneOffsetDays: -15 },
      { label: 'Straight-through feed live in production', targetOffsetDays: 7, done: false },
      { label: 'Three clean submission months evidenced', targetOffsetDays: 40, done: false },
    ],
    updates: [
      { offsetDays: -15, authorName: 'Ibrahim Sani (Northstar — institution portal)', text: 'Vendor selected; feed configuration in progress; no late submissions in the last 18 business days (demo).', progressPct: 80 },
    ],
    evidenceRefs: [],
  },
  'CAP-2026-005': {
    agreedPlan:
      'Re-appraise the 25 sampled credit files, remediate appraisal workflow gaps and deliver a closure evidence pack. Agreed under FND-2026-044 (demo plan).',
    findingRef: 'FND-2026-044',
    validationStatus: 'Validated',
    milestones: [
      { label: 'Re-appraisals complete (23 of 25 files)', targetOffsetDays: -20, done: true, doneOffsetDays: -21 },
      { label: 'Appraisal checklist gate added to workflow', targetOffsetDays: -12, done: true, doneOffsetDays: -12 },
      { label: 'Closure evidence pack submitted', targetOffsetDays: -8, done: true, doneOffsetDays: -6 },
    ],
    updates: [
      { offsetDays: -6, authorName: 'Ngozi Emenike (Delta — institution portal)', text: 'Final evidence pack submitted; two remaining files re-appraised after branch relocation. Demo update.', progressPct: 100 },
    ],
    evidenceRefs: ['EV-2026-106'],
  },
  'CAP-2026-007': {
    agreedPlan:
      'Capital restoration and governance restructuring: recapitalisation in two tranches, board restructuring with two independent additions, monthly supervisory reporting. Agreed under FND-2026-030 with enforcement case ENF-2026-002 open (demo plan).',
    findingRef: 'FND-2026-030',
    validationStatus: 'Pending Validation',
    milestones: [
      { label: 'Recapitalisation tranche 1 committed', targetOffsetDays: -10, done: true, doneOffsetDays: -11 },
      { label: 'Board restructuring completed', targetOffsetDays: 10, done: false },
      { label: 'Recapitalisation tranche 2 committed', targetOffsetDays: 25, done: false },
      { label: 'CAR restored above the demo 10% minimum', targetOffsetDays: 60, done: false },
    ],
    updates: [
      { offsetDays: -11, authorName: 'Kunle Oyelowo (Vanguard — institution portal)', text: 'Tranche 1 shareholder commitment signed; batch 2 evidence uploaded for review (demo).', progressPct: 35 },
    ],
    evidenceRefs: ['EV-2026-109'],
    escalations: [
      { offsetDays: -75, byName: 'Zainab Lawal', level: 'Level 3 — enforcement', note: 'Managed under enforcement case ENF-2026-002; licence suspended (demo).' },
    ],
  },
  'CAP-2026-008': {
    agreedPlan:
      'Third-party risk register uplift: register both missing payment aggregators, complete assurance reviews, add a change-management gate so integrations cannot bypass the register. Agreed under FND-2026-066 (demo plan).',
    findingRef: 'FND-2026-066',
    validationStatus: 'Pending Validation',
    milestones: [
      { label: 'Register updated with both aggregators', targetOffsetDays: -5, done: true, doneOffsetDays: -8 },
      { label: 'Change-management gate live in release pipeline', targetOffsetDays: 5, done: false },
      { label: 'Assurance reviews completed for both parties', targetOffsetDays: 12, done: false },
    ],
    updates: [
      { offsetDays: -8, authorName: 'Zara Nwosu (Crestline — institution portal)', text: 'Updated register extract uploaded (v3); pipeline gate in final testing. Demo update.', progressPct: 55 },
    ],
    evidenceRefs: ['EV-2026-108'],
  },
}

/** Merge base corrective action + detail seed. */
export const buildCapDetail = (index: number, cap: (typeof CORRECTIVE_ACTIONS)[number]): CorrectiveActionDetail => {
  const seed = SEEDS[cap.reference]
  if (!seed) throw new Error(`demo CAP seed missing: ${cap.reference}`)
  return {
    ...cap,
    findingRef: seed.findingRef,
    agreedPlan: seed.agreedPlan,
    validationStatus: seed.validationStatus,
    milestones: seed.milestones.map((m, i) => ({
      id: demoUuid(65, index * 20 + i),
      label: m.label,
      targetDate: isoDay(m.targetOffsetDays),
      done: m.done,
      doneAt: m.doneOffsetDays === undefined ? undefined : isoDay(m.doneOffsetDays),
    })),
    institutionUpdates: seed.updates.map((u, i) => ({
      id: demoUuid(66, index * 20 + i),
      at: isoDateTime(u.offsetDays, 12, 0),
      authorName: u.authorName,
      text: u.text,
      progressPct: u.progressPct,
    })),
    evidenceIds: seed.evidenceRefs.map((ref) => `ref:${ref}`), // resolved to ids by the repository
    extensionRequests: (seed.extensions ?? []).map((x, i) => ({
      id: demoUuid(67, index * 10 + i),
      requestedAt: isoDateTime(x.requestedOffsetDays, 9, 0),
      requestedByName: x.requestedByName,
      newDueDate: isoDay(x.newDueOffsetDays),
      reason: x.reason,
      status: x.status,
      decidedByName: x.decidedByName,
      decidedAt: x.decidedOffsetDays === undefined ? undefined : isoDateTime(x.decidedOffsetDays, 9, 0),
      decisionNote: x.decisionNote,
    })),
    escalations: (seed.escalations ?? []).map((e, i) => ({
      id: demoUuid(68, index * 10 + i),
      at: isoDateTime(e.offsetDays, 16, 0),
      byName: e.byName,
      level: e.level,
      note: e.note,
    })),
    closure: seed.closure,
  }
}

export const CAP_DETAIL_REFS = Object.keys(SEEDS)
