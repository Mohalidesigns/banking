import type { DemoRole, DemoUser, Jurisdiction } from '@/types/auth'

export interface RegulatorSignInInput {
  email: string
  password: string
  /** Visual prototype only — "remember device" checkbox. */
  rememberDevice?: boolean
}

export interface PortalSignInInput {
  institutionCode: string
  email: string
  password: string
}

export interface SessionResult {
  user: DemoUser
  /** Authorised jurisdictions for regulator users; empty for portal users. */
  jurisdictions: Jurisdiction[]
}

export interface PasswordResetRequestResult {
  accepted: boolean
  /** Prototype-honest message, e.g. "Simulated in prototype session". */
  message: string
}

export interface PasswordResetInput {
  email: string
  token: string
  password: string
  confirmPassword: string
}

/**
 * Authentication contract (Spec §18.3). Components and stores depend on this
 * interface only; MockAuthService implements it for the prototype and a
 * future ApiAuthService (OIDC/OAuth, Spec §18.6) will slot in unchanged.
 */
export interface AuthService {
  signIn(input: RegulatorSignInInput): Promise<SessionResult>
  portalSignIn(input: PortalSignInInput): Promise<SessionResult>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>
  resetPassword(input: PasswordResetInput): Promise<PasswordResetRequestResult>
  /** Demo identities offered by the prototype role switcher. */
  listDemoUsers(): Promise<DemoUser[]>
  switchDemoRole(role: DemoRole): Promise<SessionResult>
}

/** Error carrying a stable code so the UI can react without string matching. */
export class AuthError extends Error {
  constructor(
    public readonly code: 'invalid-email' | 'unknown-institution' | 'invalid-reset',
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
