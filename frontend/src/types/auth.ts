/**
 * Authentication and demo-identity types.
 *
 * NOTE: the prototype deliberately has no real authentication (Spec §1.1).
 * DemoRole ids are reconciled with the Spec §19 demo-role matrix (17 roles);
 * ROLE_PROFILES in `src/config/roles.ts` carries the mock permission profile
 * for each role. The role switcher always shows the persistent
 * "DEMO ROLE — NOT SECURE AUTHENTICATION" indicator.
 */

export type DemoRole =
  | 'system-administrator'
  | 'director-of-supervision'
  | 'deputy-director'
  | 'assistant-director'
  | 'supervisory-team-lead'
  | 'principal-examiner'
  | 'examiner'
  | 'prudential-analyst'
  | 'risk-analyst'
  | 'cybersecurity-specialist'
  | 'aml-specialist'
  | 'legal-enforcement-officer'
  | 'report-reviewer'
  | 'read-only-supervisor'
  | 'institution-administrator'
  | 'institution-submitter'
  | 'institution-viewer'

/** Spec §19 role order for the role switcher. */
export const DEMO_ROLE_ORDER: DemoRole[] = [
  'system-administrator',
  'director-of-supervision',
  'deputy-director',
  'assistant-director',
  'supervisory-team-lead',
  'principal-examiner',
  'examiner',
  'prudential-analyst',
  'risk-analyst',
  'cybersecurity-specialist',
  'aml-specialist',
  'legal-enforcement-officer',
  'report-reviewer',
  'read-only-supervisor',
  'institution-administrator',
  'institution-submitter',
  'institution-viewer',
]

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  'system-administrator': 'System Administrator',
  'director-of-supervision': 'Director of Supervision',
  'deputy-director': 'Deputy Director',
  'assistant-director': 'Assistant Director',
  'supervisory-team-lead': 'Supervisory Team Lead',
  'principal-examiner': 'Principal Examiner',
  examiner: 'Examiner',
  'prudential-analyst': 'Prudential Analyst',
  'risk-analyst': 'Risk Analyst',
  'cybersecurity-specialist': 'Cybersecurity Specialist',
  'aml-specialist': 'AML Specialist',
  'legal-enforcement-officer': 'Legal/Enforcement Officer',
  'report-reviewer': 'Report Reviewer',
  'read-only-supervisor': 'Read-Only Supervisor',
  'institution-administrator': 'Institution Administrator',
  'institution-submitter': 'Institution Submitter',
  'institution-viewer': 'Institution Viewer',
}

/** Roles that live in the institution portal layout (Spec §19). */
export const INSTITUTION_ROLES: DemoRole[] = [
  'institution-administrator',
  'institution-submitter',
  'institution-viewer',
]

export const isInstitutionRole = (role: DemoRole): boolean => INSTITUTION_ROLES.includes(role)

/** Action keys gated per role in the demo (Spec §19 "Allowed page actions").
 *  Phase 2B adds the examination/finding/remediation workflow actions. */
export type DemoAction =
  | 'view'
  | 'create-institution'
  | 'edit-institution'
  | 'assign-team'
  | 'import-institutions'
  | 'export'
  | 'approve'
  | 'manage-work-queue'
  | 'reassign-work'
  | 'add-note'
  | 'reset-demo-data'
  // Examination operations (Spec §7)
  | 'create-examination'
  | 'record-fieldwork'
  | 'review-procedures'
  | 'approve-results'
  | 'request-information'
  | 'manage-library'
  | 'upload-evidence'
  | 'review-evidence'
  // Findings & remediation (Spec §7.7–§7.8)
  | 'raise-finding'
  | 'review-finding'
  | 'approve-finding'
  | 'respond-finding'
  | 'manage-remediation'
  | 'validate-remediation'
  | 'close-remediation'
  // Risk-based supervision (Spec §6.2–§6.3)
  | 'submit-assessment'
  | 'approve-assessment'
  | 'manage-plans'
  | 'approve-plans'
  // Regulatory returns (Spec §11, Phase 3A)
  | 'review-submission'
  | 'approve-submission'
  | 'manage-return-templates'
  // Off-site surveillance & early warnings (Spec §6.1/§6.4, Phase 3A)
  | 'create-analyst-review'
  | 'manage-alerts'

export type DemoScope = 'authority' | 'department' | 'team' | 'portfolio' | 'institution'

/** Mock permission profile per role (Spec §19). Frontend-only demo gating —
 *  never a substitute for backend authorisation (Spec §18.6). */
export interface RolePermissionProfile {
  role: DemoRole
  label: string
  /** True for the three institution roles — portal layout, not regulator. */
  portal: boolean
  /** Visible regulator nav section ids; undefined = all sections. */
  visibleNavSections?: string[]
  /** Visible portal nav paths; undefined = all portal items. */
  visiblePortalNav?: string[]
  allowedActions: DemoAction[]
  scope: DemoScope
  canApprove: boolean
  canExport: boolean
  /** Restricted data areas shown in the role switcher (demo labelling). */
  restrictedAreas: string[]
}

/** A supervisory context the demo user is authorised for. */
export interface Jurisdiction {
  /** UUID-shaped id */
  id: string
  /** Short code shown in the topbar selector */
  code: string
  name: string
  authority: string
}

/** Institution context for portal demo users (Spec §15). */
export interface PortalContext {
  institutionId: string
  institutionCode: string
  institutionName: string
}

export interface DemoUser {
  /** UUID-shaped id */
  id: string
  fullName: string
  email: string
  /** Two-letter avatar initials */
  initials: string
  jobTitle: string
  role: DemoRole
  /** Jurisdictions this user is authorised for (regulator users only). */
  jurisdictionIds: string[]
  /** Present only for institution portal users. */
  portal?: PortalContext
}

export const isPortalUser = (user: DemoUser): boolean => Boolean(user.portal)
