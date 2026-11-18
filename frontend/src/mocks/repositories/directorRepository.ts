/** Mock directors & key officers repository (Spec §18.3). Read-only for the prototype. */
import { DIRECTORS } from '@/mocks/fixtures/directors.fixture'
import type { Director } from '@/types/institution'

export const directorRepository = {
  list(): Director[] {
    return DIRECTORS.map((d) => ({ ...d }))
  },

  byInstitution(institutionId: string): Director[] {
    return DIRECTORS.filter((d) => d.institutionId === institutionId).map((d) => ({ ...d }))
  },

  byId(id: string): Director | undefined {
    const d = DIRECTORS.find((x) => x.id === id)
    return d ? { ...d } : undefined
  },
}
