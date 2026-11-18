import { PORTAL_NAV, REGULATOR_NAV, type NavItem, type NavSection } from '@/config/navigation'
import {
  DEMO_ROLE_LABELS,
  isInstitutionRole,
  type DemoAction,
  type DemoRole,
  type RolePermissionProfile,
} from '@/types/auth'

/**
 * Mock permission profiles for the 17 Spec §19 demo roles: visible
 * navigation, allowed page actions, scope, approval/export capability and
 * restricted areas. This is demo gating for the prototype only — a real
 * deployment enforces permissions server-side (Spec §18.6).
 */

const ALL_ACTIONS: DemoAction[] = [
  'view',
  'create-institution',
  'edit-institution',
  'assign-team',
  'import-institutions',
  'export',
  'approve',
  'manage-work-queue',
  'reassign-work',
  'add-note',
  'reset-demo-data',
  'create-examination',
  'record-fieldwork',
  'review-procedures',
  'approve-results',
  'request-information',
  'manage-library',
  'upload-evidence',
  'review-evidence',
  'raise-finding',
  'review-finding',
  'approve-finding',
  'respond-finding',
  'manage-remediation',
  'validate-remediation',
  'close-remediation',
  'submit-assessment',
  'approve-assessment',
  'manage-plans',
  'approve-plans',
]

const WORK_ACTIONS: DemoAction[] = ['view', 'manage-work-queue', 'add-note']

/** Fieldwork contribution (execute procedures, capture evidence, raise findings). */
const FIELDWORK_ACTIONS: DemoAction[] = [
  'record-fieldwork',
  'upload-evidence',
  'raise-finding',
  'request-information',
]

/** Review tier: may review but never approve (Spec §19 canApprove = false). */
const REVIEW_ACTIONS: DemoAction[] = [
  'create-examination',
  'record-fieldwork',
  'review-procedures',
  'request-information',
  'manage-library',
  'upload-evidence',
  'review-evidence',
  'raise-finding',
  'review-finding',
  'manage-remediation',
  'validate-remediation',
  'submit-assessment',
]

/** Approval tier: team lead and above may approve results/findings/closure. */
const APPROVAL_ACTIONS: DemoAction[] = [
  'create-examination',
  'record-fieldwork',
  'review-procedures',
  'approve-results',
  'request-information',
  'manage-library',
  'upload-evidence',
  'review-evidence',
  'raise-finding',
  'review-finding',
  'approve-finding',
  'manage-remediation',
  'validate-remediation',
  'close-remediation',
  'submit-assessment',
  'manage-plans',
]

type ProfileSeed = Omit<RolePermissionProfile, 'role' | 'label'>

const seeds: Record<DemoRole, ProfileSeed> = {
  'system-administrator': {
    portal: false,
    allowedActions: ['view', 'export', 'import-institutions', 'reset-demo-data'],
    scope: 'authority',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['Supervisory approvals', 'Examination fieldwork'],
  },
  'director-of-supervision': {
    portal: false,
    allowedActions: ALL_ACTIONS,
    scope: 'authority',
    canApprove: true,
    canExport: true,
    restrictedAreas: [],
  },
  'deputy-director': {
    portal: false,
    visibleNavSections: [
      'overview',
      'institutions',
      'surveillance',
      'examinations',
      'prudential',
      'specialist',
      'regulatory',
      'action',
      'intelligence',
    ],
    allowedActions: ALL_ACTIONS.filter((a) => a !== 'reset-demo-data'),
    scope: 'authority',
    canApprove: true,
    canExport: true,
    restrictedAreas: ['System settings'],
  },
  'assistant-director': {
    portal: false,
    visibleNavSections: [
      'overview',
      'institutions',
      'surveillance',
      'examinations',
      'prudential',
      'specialist',
      'regulatory',
      'action',
      'intelligence',
    ],
    allowedActions: [
      'view',
      'edit-institution',
      'assign-team',
      'export',
      'approve',
      'manage-work-queue',
      'reassign-work',
      'add-note',
      ...APPROVAL_ACTIONS,
      'approve-assessment',
      'approve-plans',
    ],
    scope: 'department',
    canApprove: true,
    canExport: true,
    restrictedAreas: ['System settings', 'Institution registration'],
  },
  'supervisory-team-lead': {
    portal: false,
    visibleNavSections: [
      'overview',
      'institutions',
      'surveillance',
      'examinations',
      'prudential',
      'intelligence',
    ],
    allowedActions: [
      'view',
      'edit-institution',
      'assign-team',
      'export',
      'approve',
      'manage-work-queue',
      'reassign-work',
      'add-note',
      ...APPROVAL_ACTIONS,
    ],
    scope: 'team',
    canApprove: true,
    canExport: true,
    restrictedAreas: ['Enforcement actions', 'System administration'],
  },
  'principal-examiner': {
    portal: false,
    visibleNavSections: ['overview', 'institutions', 'examinations'],
    allowedActions: ['view', 'export', 'manage-work-queue', 'reassign-work', 'add-note', ...REVIEW_ACTIONS],
    scope: 'team',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['Approvals', 'Enforcement actions', 'System administration'],
  },
  examiner: {
    portal: false,
    visibleNavSections: ['overview', 'examinations'],
    allowedActions: [...WORK_ACTIONS, ...FIELDWORK_ACTIONS],
    scope: 'team',
    canApprove: false,
    canExport: false,
    restrictedAreas: ['Approvals', 'Export', 'Institution editing'],
  },
  'prudential-analyst': {
    portal: false,
    visibleNavSections: ['overview', 'surveillance', 'prudential', 'institutions'],
    allowedActions: ['view', 'export', 'add-note'],
    scope: 'portfolio',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['Examination fieldwork', 'Enforcement actions'],
  },
  'risk-analyst': {
    portal: false,
    visibleNavSections: ['overview', 'surveillance', 'institutions'],
    allowedActions: ['view', 'export', 'add-note', 'submit-assessment', 'upload-evidence'],
    scope: 'portfolio',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['Examination fieldwork', 'Enforcement actions'],
  },
  'cybersecurity-specialist': {
    portal: false,
    visibleNavSections: ['overview', 'examinations', 'specialist'],
    allowedActions: ['view', 'export', 'add-note', 'record-fieldwork', 'upload-evidence', 'raise-finding'],
    scope: 'authority',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['Enforcement actions', 'Institution editing'],
  },
  'aml-specialist': {
    portal: false,
    visibleNavSections: ['overview', 'examinations', 'specialist'],
    allowedActions: ['view', 'export', 'add-note', 'record-fieldwork', 'upload-evidence', 'raise-finding'],
    scope: 'authority',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['Enforcement actions', 'Institution editing'],
  },
  'legal-enforcement-officer': {
    portal: false,
    visibleNavSections: ['overview', 'institutions', 'action', 'regulatory'],
    allowedActions: ['view', 'export', 'add-note', 'review-finding', 'manage-remediation'],
    scope: 'authority',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['Examination fieldwork', 'Institution editing'],
  },
  'report-reviewer': {
    portal: false,
    visibleNavSections: ['overview', 'intelligence'],
    allowedActions: ['view', 'export', 'add-note'],
    scope: 'authority',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['Examination fieldwork', 'Enforcement actions'],
  },
  'read-only-supervisor': {
    portal: false,
    visibleNavSections: [
      'overview',
      'institutions',
      'surveillance',
      'examinations',
      'prudential',
      'specialist',
      'regulatory',
      'action',
      'intelligence',
    ],
    allowedActions: ['view'],
    scope: 'authority',
    canApprove: false,
    canExport: false,
    restrictedAreas: ['All write actions', 'Export', 'Approvals'],
  },
  'institution-administrator': {
    portal: true,
    allowedActions: ['view', 'add-note', 'respond-finding', 'manage-remediation', 'upload-evidence'],
    scope: 'institution',
    canApprove: false,
    canExport: true,
    restrictedAreas: ['All regulator supervision screens', 'Finding approval', 'Remediation closure'],
  },
  'institution-submitter': {
    portal: true,
    visiblePortalNav: [
      '/portal/dashboard',
      '/portal/returns',
      '/portal/requests',
      '/portal/remediation',
      '/portal/messages',
      '/portal/documents',
    ],
    allowedActions: ['view', 'respond-finding', 'upload-evidence'],
    scope: 'institution',
    canApprove: false,
    canExport: false,
    restrictedAreas: ['Organisation user administration', 'Finding approval', 'Remediation closure'],
  },
  'institution-viewer': {
    portal: true,
    visiblePortalNav: ['/portal/dashboard', '/portal/documents', '/portal/messages'],
    allowedActions: ['view'],
    scope: 'institution',
    canApprove: false,
    canExport: false,
    restrictedAreas: ['Return submissions', 'Remediation responses', 'Organisation users'],
  },
}

export const ROLE_PROFILES: Record<DemoRole, RolePermissionProfile> = Object.fromEntries(
  (Object.keys(seeds) as DemoRole[]).map((role) => [
    role,
    { role, label: DEMO_ROLE_LABELS[role], ...seeds[role] },
  ]),
) as Record<DemoRole, RolePermissionProfile>

export const getRoleProfile = (role: DemoRole): RolePermissionProfile => ROLE_PROFILES[role]

export const can = (role: DemoRole, action: DemoAction): boolean =>
  ROLE_PROFILES[role].allowedActions.includes(action)

/** Regulator nav sections visible to a role (Spec §19). */
export function visibleRegulatorNav(role: DemoRole): NavSection[] {
  const profile = ROLE_PROFILES[role]
  if (isInstitutionRole(role)) return []
  if (!profile.visibleNavSections) return REGULATOR_NAV
  return REGULATOR_NAV.filter((section) => profile.visibleNavSections!.includes(section.id))
    .map((section) => ({ ...section, items: [...section.items] }))
    .filter((section) => section.items.length > 0)
}

/** Portal nav items visible to an institution role (Spec §19). */
export function visiblePortalNav(role: DemoRole): NavItem[] {
  const profile = ROLE_PROFILES[role]
  if (!profile.visiblePortalNav) return PORTAL_NAV
  return PORTAL_NAV.filter((item) => profile.visiblePortalNav!.includes(item.path))
}
