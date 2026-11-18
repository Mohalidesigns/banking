/**
 * Mock identity repository (Spec §18.3 pattern).
 * The future backend integration replaces the mock service that reads this
 * repository; components and stores never touch it directly.
 */
import { DEFAULT_REGULATOR_USER, DEMO_USERS, JURISDICTIONS } from '@/mocks/fixtures/identity.fixture'
import type { DemoRole, DemoUser, Jurisdiction } from '@/types/auth'

export const authRepository = {
  listUsers(): DemoUser[] {
    return [...DEMO_USERS]
  },

  listRegulatorUsers(): DemoUser[] {
    return DEMO_USERS.filter((u) => !u.portal)
  },

  findByEmail(email: string): DemoUser | undefined {
    const needle = email.trim().toLowerCase()
    return DEMO_USERS.find((u) => u.email.toLowerCase() === needle)
  },

  findByPortalCode(institutionCode: string): DemoUser | undefined {
    const needle = institutionCode.trim().toUpperCase()
    return DEMO_USERS.find((u) => u.portal?.institutionCode.toUpperCase() === needle)
  },

  findFirstByRole(role: DemoRole): DemoUser | undefined {
    return DEMO_USERS.find((u) => u.role === role)
  },

  defaultRegulatorUser(): DemoUser {
    return DEFAULT_REGULATOR_USER
  },

  listJurisdictions(): Jurisdiction[] {
    return [...JURISDICTIONS]
  },

  jurisdictionsFor(user: DemoUser): Jurisdiction[] {
    return JURISDICTIONS.filter((j) => user.jurisdictionIds.includes(j.id))
  },
}
