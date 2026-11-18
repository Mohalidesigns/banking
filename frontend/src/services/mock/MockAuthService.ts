import { authRepository } from '@/mocks/repositories/authRepository'
import type {
  AuthService,
  PasswordResetInput,
  PasswordResetRequestResult,
  PortalSignInInput,
  RegulatorSignInInput,
  SessionResult,
} from '@/services/contracts/AuthService'
import { AuthError } from '@/services/contracts/AuthService'
import type { DemoRole, DemoUser } from '@/types/auth'

const DEMO_LATENCY_MS = 350

const latency = () => new Promise<void>((resolve) => setTimeout(resolve, DEMO_LATENCY_MS))

const sessionFor = (user: DemoUser): SessionResult => ({
  user,
  jurisdictions: authRepository.jurisdictionsFor(user),
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Prototype authentication (Spec §5.1). There is no real security boundary:
 * any password is accepted for demo identities, and unknown regulator emails
 * fall back to the default demo user so any demo credentials work.
 * No credentials are ever persisted (Spec §17.4).
 */
export class MockAuthService implements AuthService {
  async signIn(input: RegulatorSignInInput): Promise<SessionResult> {
    await latency()
    if (!EMAIL_PATTERN.test(input.email)) {
      throw new AuthError('invalid-email', 'Enter a valid email address to continue the demo.')
    }
    const user =
      authRepository.findByEmail(input.email) ?? authRepository.defaultRegulatorUser()
    if (user.portal) {
      // A portal identity cannot sign in on the regulator side.
      throw new AuthError(
        'invalid-email',
        'This is an institution portal account. Use the Institution Portal sign-in.',
      )
    }
    return sessionFor(user)
  }

  async portalSignIn(input: PortalSignInInput): Promise<SessionResult> {
    await latency()
    if (!EMAIL_PATTERN.test(input.email)) {
      throw new AuthError('invalid-email', 'Enter a valid email address to continue the demo.')
    }
    const user = authRepository.findByPortalCode(input.institutionCode)
    if (!user?.portal) {
      throw new AuthError(
        'unknown-institution',
        'Institution code not recognised. Try MCB-001 (Meridian Commercial Bank) or NMB-002 (Northstar Merchant Bank).',
      )
    }
    return sessionFor(user)
  }

  async signOut(): Promise<void> {
    await latency()
  }

  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    await latency()
    if (!EMAIL_PATTERN.test(email)) {
      throw new AuthError('invalid-email', 'Enter a valid email address.')
    }
    return {
      accepted: true,
      message:
        'Simulated in prototype session — no reset email was sent. Use token DEMO-RESET to continue.',
    }
  }

  async resetPassword(input: PasswordResetInput): Promise<PasswordResetRequestResult> {
    await latency()
    if (input.password !== input.confirmPassword) {
      throw new AuthError('invalid-reset', 'Passwords do not match.')
    }
    if (input.password.length < 8) {
      throw new AuthError('invalid-reset', 'Password must be at least 8 characters.')
    }
    return {
      accepted: true,
      message: 'Simulated in prototype session — password reset completed (demo only).',
    }
  }

  async listDemoUsers(): Promise<DemoUser[]> {
    return authRepository.listUsers()
  }

  async switchDemoRole(role: DemoRole): Promise<SessionResult> {
    await latency()
    const user = authRepository.findFirstByRole(role) ?? authRepository.defaultRegulatorUser()
    return sessionFor(user)
  }
}

export const authService: AuthService = new MockAuthService()
