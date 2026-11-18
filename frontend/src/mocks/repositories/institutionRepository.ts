/**
 * Mock institution repository (Spec §18.3 pattern). Mutable in-memory store
 * seeded from fixtures; services read/write it, components never do.
 * A future ApiInstitutionService replaces the service, not this shape.
 */
import {
  ACTIVITY_EVENTS,
  FINANCIAL_SNAPSHOTS,
  INSTITUTIONS,
  INSTITUTION_DOCUMENTS,
  INSTITUTION_GROUPS,
  RATING_DIMENSIONS,
  SHAREHOLDERS,
} from '@/mocks/fixtures/institutions.fixture'
import type {
  ActivityEvent,
  CreateInstitutionInput,
  FinancialSnapshot,
  Institution,
  InstitutionDocument,
  InstitutionGroup,
  RatingDimension,
  Shareholder,
  UpdateInstitutionInput,
} from '@/types/institution'

const records: Institution[] = INSTITUTIONS.map((i) => ({ ...i }))

const nextId = (): string =>
  `d0000000-0000-4000-a000-${String(Date.now() % 1e12).padStart(12, '0')}`

export const institutionRepository = {
  list(): Institution[] {
    return records.map((i) => ({ ...i }))
  },

  byId(id: string): Institution | undefined {
    const found = records.find((i) => i.id === id)
    return found ? { ...found } : undefined
  },

  /** Institution codes must be unique within the regulator (Spec §5.4). */
  isCodeTaken(code: string, exceptId?: string): boolean {
    const needle = code.trim().toUpperCase()
    return records.some((i) => i.code.toUpperCase() === needle && i.id !== exceptId)
  },

  create(input: CreateInstitutionInput): Institution {
    const now = new Date().toISOString()
    const created: Institution = {
      ...input,
      openFindingsCount: input.openFindingsCount ?? 0,
      id: nextId(),
      createdAt: now,
      updatedAt: now,
    }
    records.unshift(created)
    ACTIVITY_EVENTS.unshift({
      id: nextId(),
      institutionId: created.id,
      type: 'institution',
      title: `Institution registered — ${created.tradingName}`,
      detail: `${created.code} added to the registry in this prototype session (demo record).`,
      actor: 'Prototype session',
      at: now,
    })
    return { ...created }
  },

  update(id: string, input: UpdateInstitutionInput): Institution | undefined {
    const idx = records.findIndex((i) => i.id === id)
    if (idx === -1) return undefined
    const updated: Institution = {
      ...records[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    records[idx] = updated
    return { ...updated }
  },

  groups(): InstitutionGroup[] {
    return INSTITUTION_GROUPS.map((g) => ({ ...g }))
  },

  groupById(id: string): InstitutionGroup | undefined {
    const g = INSTITUTION_GROUPS.find((x) => x.id === id)
    return g ? { ...g } : undefined
  },

  groupsForInstitution(institutionId: string): InstitutionGroup[] {
    return INSTITUTION_GROUPS.filter((g) => g.memberInstitutionIds.includes(institutionId)).map(
      (g) => ({ ...g }),
    )
  },

  shareholders(institutionId: string): Shareholder[] {
    return SHAREHOLDERS.filter((s) => s.institutionId === institutionId).map((s) => ({ ...s }))
  },

  documents(institutionId: string): InstitutionDocument[] {
    return INSTITUTION_DOCUMENTS.filter((d) => d.institutionId === institutionId).map((d) => ({ ...d }))
  },

  ratingDimensions(institutionId: string): RatingDimension[] {
    return RATING_DIMENSIONS.filter((d) => d.institutionId === institutionId).map((d) => ({ ...d }))
  },

  financials(institutionId: string): FinancialSnapshot[] {
    return FINANCIAL_SNAPSHOTS.filter((f) => f.institutionId === institutionId)
      .map((f) => ({ ...f }))
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
  },

  activity(institutionId?: string | null): ActivityEvent[] {
    const events =
      institutionId === undefined
        ? ACTIVITY_EVENTS
        : ACTIVITY_EVENTS.filter((e) => e.institutionId === institutionId || e.institutionId === null)
    return [...events].sort((a, b) => b.at.localeCompare(a.at))
  },

  addActivity(event: Omit<ActivityEvent, 'id'>): void {
    ACTIVITY_EVENTS.unshift({ ...event, id: nextId() })
  },

  /** Prototype-only: restore the initial demo dataset (Spec §17.4). */
  reset(): void {
    records.length = 0
    INSTITUTIONS.forEach((i) => records.push({ ...i }))
  },
}
