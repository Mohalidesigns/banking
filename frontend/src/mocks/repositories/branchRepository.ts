/** Mock branch network repository (Spec §18.3). Read-only for the prototype. */
import { BRANCHES } from '@/mocks/fixtures/branches.fixture'
import type { Branch } from '@/types/institution'

export const branchRepository = {
  list(): Branch[] {
    return BRANCHES.map((b) => ({ ...b }))
  },

  byInstitution(institutionId: string): Branch[] {
    return BRANCHES.filter((b) => b.institutionId === institutionId).map((b) => ({ ...b }))
  },

  byId(id: string): Branch | undefined {
    const b = BRANCHES.find((x) => x.id === id)
    return b ? { ...b } : undefined
  },
}
