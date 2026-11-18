import type { Paginated } from '@/types/common'
import type { Jurisdiction } from '@/types/auth'
import type {
  ActivityEvent,
  Branch,
  CreateInstitutionInput,
  Director,
  FinancialSnapshot,
  Institution,
  InstitutionDocument,
  InstitutionGroup,
  InstitutionQuery,
  RatingDimension,
  Shareholder,
  UpdateInstitutionInput,
} from '@/types/institution'

export interface SupervisoryTeamOption {
  id: string
  name: string
  department: string
  leadName: string
}

/**
 * Institution contract (Spec §18.3 example, extended for the registry,
 * profile and group screens). Components depend on this interface only;
 * MockInstitutionService reads the mock repository, a future
 * ApiInstitutionService calls Spring Boot endpoints unchanged.
 */
export interface InstitutionService {
  list(query?: InstitutionQuery): Promise<Paginated<Institution>>
  getById(id: string): Promise<Institution>
  create(input: CreateInstitutionInput): Promise<Institution>
  update(id: string, input: UpdateInstitutionInput): Promise<Institution>
  assignTeam(id: string, teamId: string): Promise<Institution>
  /** Unique institution code within the regulator (Spec §5.4 validation). */
  isCodeAvailable(code: string, exceptId?: string): Promise<boolean>
  listTeams(): Promise<SupervisoryTeamOption[]>
  /** Regulator staff for lead-supervisor assignment (demo directory). */
  listStaff(): Promise<Array<{ id: string; fullName: string; jobTitle: string }>>
  /** All jurisdictions known to the prototype (registry column labels). */
  listJurisdictions(): Promise<Jurisdiction[]>

  // Profile sub-resources (Spec §5.5)
  shareholders(institutionId: string): Promise<Shareholder[]>
  documents(institutionId: string): Promise<InstitutionDocument[]>
  ratingDimensions(institutionId: string): Promise<RatingDimension[]>
  financials(institutionId: string): Promise<FinancialSnapshot[]>
  /** Activity for one institution, or authority-wide when omitted. */
  activity(institutionId?: string): Promise<ActivityEvent[]>
  /** Quick action: add a supervisory note (prototype-session activity). */
  addNote(institutionId: string, text: string, author: string): Promise<void>

  // Groups (Spec §5.6)
  listGroups(): Promise<InstitutionGroup[]>
  groupsForInstitution(institutionId: string): Promise<InstitutionGroup[]>
}

/** Branch network contract (Spec §5.6). */
export interface BranchQuery {
  institutionId?: string
  region?: string
  operationalStatus?: string
  search?: string
}

export interface BranchService {
  list(query?: BranchQuery): Promise<Branch[]>
  getById(id: string): Promise<Branch | undefined>
  regions(): Promise<string[]>
}

/** Directors & key officers contract (Spec §5.6). */
export interface DirectorQuery {
  institutionId?: string
  search?: string
  fitAndProperStatus?: string
  category?: string
}

export interface DirectorService {
  list(query?: DirectorQuery): Promise<Director[]>
  getById(id: string): Promise<Director | undefined>
}
