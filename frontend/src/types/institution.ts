/**
 * Institution-management data contracts (Spec §18.4).
 * All ids are UUID-shaped, dates ISO 8601, money decimal strings (Spec §17.5).
 * Every record in the prototype is fictional demo data.
 */
import type { RiskRating } from '@/types/common'

export type InstitutionCategory =
  | 'Commercial Bank'
  | 'Merchant Bank'
  | 'Non-Interest Bank'
  | 'Payment Service Bank'
  | 'Savings & Loans Bank'
  | 'Microfinance Bank'
  | 'Custody & Trust Bank'
  | 'Regional Bank'

export const INSTITUTION_CATEGORIES: InstitutionCategory[] = [
  'Commercial Bank',
  'Merchant Bank',
  'Non-Interest Bank',
  'Payment Service Bank',
  'Savings & Loans Bank',
  'Microfinance Bank',
  'Custody & Trust Bank',
  'Regional Bank',
]

export type LicenceStatus = 'Active' | 'Provisional' | 'Suspended' | 'Revoked'
export type PortfolioStatus = 'Satisfactory' | 'Under Review' | 'Watch' | 'Deteriorating'
export type InstitutionStatus = 'Active' | 'Restructuring' | 'Wound Down'
export type OwnershipType = 'Public Listed' | 'Private' | 'State-Owned' | 'Mutual' | 'Subsidiary of Foreign Group'
export type LegalForm = 'Public Limited Company' | 'Private Limited Company' | 'Statutory Corporation' | 'Cooperative'

export interface ContactPerson {
  name: string
  email: string
  phone: string
}

export interface Institution {
  /** UUID-shaped id */
  id: string
  /** Unique institution code within the regulator (e.g. MCB-001) */
  code: string
  legalName: string
  tradingName: string
  registrationNumber: string
  licenceNumber: string
  licenceType: string
  licenceStatus: LicenceStatus
  category: InstitutionCategory
  legalForm: LegalForm
  ownershipType: OwnershipType
  jurisdictionId: string
  /** ISO 4217 */
  currency: string
  region: string
  country: string
  dates: {
    /** ISO 8601 */
    incorporation: string
    licenceIssue: string
    commencement: string
  }
  registeredAddress: string
  website: string
  officialContact: ContactPerson
  regulatoryLiaison: ContactPerson
  supervisory: {
    department: string
    portfolio: string
    leadSupervisorId: string
    leadSupervisorName: string
    teamId: string
    teamName: string
  }
  /** Overall risk rating (demo/illustrative) */
  riskRating: RiskRating
  /** Composite supervisory rating 1 (strongest) – 5 (weakest) */
  supervisoryRating: 1 | 2 | 3 | 4 | 5
  portfolioStatus: PortfolioStatus
  status: InstitutionStatus
  /** ISO 8601 date of the most recent examination, if any */
  lastExaminationDate?: string
  openFindingsCount: number
  branchCount: number
  /** Total assets, decimal string in millions of jurisdiction currency */
  totalAssetsMM: string
  onWatchlist: boolean
  notes?: string
  /** ISO 8601 */
  createdAt: string
  updatedAt: string
}

export interface CreateInstitutionInput extends Omit<Institution, 'id' | 'createdAt' | 'updatedAt' | 'openFindingsCount'> {
  openFindingsCount?: number
}

export type UpdateInstitutionInput = Partial<CreateInstitutionInput>

export interface InstitutionQuery {
  page?: number
  pageSize?: number
  search?: string
  category?: InstitutionCategory | ''
  licenceStatus?: LicenceStatus | ''
  riskRating?: RiskRating | ''
  teamId?: string
  region?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface InstitutionGroup {
  id: string
  name: string
  /** Group identifier shown in registers */
  identifier: string
  parentEntity: string
  jurisdictionId: string
  consolidatedSupervision: 'Consolidated' | 'Solo only' | 'Pending'
  memberInstitutionIds: string[]
  /** Decimal string, millions */
  groupExposureMM: string
  riskRating: RiskRating
  leadSupervisorName: string
  notes?: string
}

export type BranchType = 'Head Office' | 'Full Service' | 'Agency' | 'Digital Service Point' | 'Cash Centre'
export type BranchStatus = 'Operational' | 'Suspended' | 'Relocating' | 'Closed'

export interface Branch {
  id: string
  institutionId: string
  name: string
  code: string
  address: string
  region: string
  type: BranchType
  operationalStatus: BranchStatus
  riskClassification: RiskRating
  /** ISO 8601 */
  openedDate: string
  lastVisitDate?: string
  managerName: string
  /** References to examinations touching this branch (demo) */
  examinationRefs: string[]
}

export type FitAndProperStatus = 'Approved' | 'Conditional' | 'Under Review' | 'Pending' | 'Rejected'
export type DirectorCategory = 'Executive' | 'Non-Executive' | 'Independent' | 'Key Officer'

export interface DirectorStatusEvent {
  /** ISO 8601 */
  date: string
  status: FitAndProperStatus | 'Appointed' | 'Resigned' | 'Suspended' | 'Reinstated'
  note: string
}

export interface Director {
  id: string
  institutionId: string
  fullName: string
  position: string
  category: DirectorCategory
  /** ISO 8601 */
  appointmentDate: string
  endDate?: string
  committeeMemberships: string[]
  fitAndProperStatus: FitAndProperStatus
  approvalStatus: 'Approved' | 'Pending Approval' | 'Conditionally Approved'
  conflictDeclarations: number
  conflictNotes?: string
  statusHistory: DirectorStatusEvent[]
}

export interface Shareholder {
  id: string
  institutionId: string
  name: string
  /** Percentage, decimal string (e.g. "34.5") */
  ownershipPct: string
  beneficialOwner: boolean
  relatedEntities: string[]
}

export type DocumentConfidentiality = 'Public' | 'Internal' | 'Confidential' | 'Restricted'

export interface InstitutionDocument {
  id: string
  institutionId: string
  category: 'Licence' | 'Financial Statements' | 'Governance' | 'Correspondence' | 'Examination Report' | 'Remediation Plan' | 'Other'
  title: string
  version: string
  /** ISO 8601 */
  uploadedDate: string
  uploader: string
  confidentiality: DocumentConfidentiality
}

/** CAMELS-style supervisory rating dimension (demo/illustrative). */
export interface RatingDimension {
  id: string
  institutionId: string
  dimension: 'Capital Adequacy' | 'Asset Quality' | 'Management' | 'Earnings' | 'Liquidity' | 'Sensitivity to Market Risk'
  /** Composite 1 (strongest) – 5 (weakest) */
  composite: 1 | 2 | 3 | 4 | 5
  rating: RiskRating
  trend: 'Improving' | 'Stable' | 'Deteriorating'
  /** ISO 8601 */
  lastAssessed: string
  commentary: string
}

/** Quarterly financial snapshot; money as decimal strings (millions). */
export interface FinancialSnapshot {
  id: string
  institutionId: string
  /** ISO 8601 period end, e.g. 2026-09-30 */
  periodEnd: string
  periodLabel: string
  totalAssetsMM: string
  totalCapitalMM: string
  netProfitMM: string
  /** Percentages as numbers for charts */
  capitalAdequacyPct: number
  nplPct: number
  liquidityRatioPct: number
  roaPct: number
  roePct: number
}

export interface ActivityEvent {
  id: string
  /** Related institution, or null for authority-wide activity */
  institutionId: string | null
  type:
    | 'examination'
    | 'finding'
    | 'return'
    | 'alert'
    | 'institution'
    | 'director'
    | 'enforcement'
    | 'assessment'
    | 'note'
  title: string
  detail: string
  actor: string
  /** ISO 8601 */
  at: string
}
