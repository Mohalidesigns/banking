/**
 * Authentication and demo-identity types.
 *
 * NOTE: the prototype deliberately has no real authentication (Spec §1.1).
 * DemoRole ids are provisional for Phase 1 and must be reconciled with the
 * Spec §19 demo-role matrix when that phase's screens are built.
 */

export type DemoRole =
  | 'supervisor-general'
  | 'lead-supervisor'
  | 'offsite-analyst'
  | 'examination-manager'
  | 'enforcement-officer'
  | 'system-administrator'
  | 'institution-user'

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  'supervisor-general': 'Supervisor-General',
  'lead-supervisor': 'Lead Supervisor',
  'offsite-analyst': 'Off-Site Surveillance Analyst',
  'examination-manager': 'Examination Manager',
  'enforcement-officer': 'Enforcement & Legal Officer',
  'system-administrator': 'System Administrator',
  'institution-user': 'Institution Portal User',
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
