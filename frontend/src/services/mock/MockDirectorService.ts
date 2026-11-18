import { directorRepository } from '@/mocks/repositories/directorRepository'
import type { DirectorQuery, DirectorService } from '@/services/contracts/InstitutionService'

const LATENCY_MS = 150
const latency = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))

export class MockDirectorService implements DirectorService {
  async list(query: DirectorQuery = {}) {
    await latency()
    const { institutionId, search = '', fitAndProperStatus, category } = query
    const q = search.trim().toLowerCase()
    return directorRepository
      .list()
      .filter((d) => {
        if (institutionId && d.institutionId !== institutionId) return false
        if (fitAndProperStatus && d.fitAndProperStatus !== fitAndProperStatus) return false
        if (category && d.category !== category) return false
        if (q && !`${d.fullName} ${d.position}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }

  async getById(id: string) {
    await latency()
    return directorRepository.byId(id)
  }
}

export const directorService: DirectorService = new MockDirectorService()
