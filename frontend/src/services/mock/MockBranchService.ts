import { branchRepository } from '@/mocks/repositories/branchRepository'
import type { BranchQuery, BranchService } from '@/services/contracts/InstitutionService'

const LATENCY_MS = 150
const latency = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))

export class MockBranchService implements BranchService {
  async list(query: BranchQuery = {}) {
    await latency()
    const { institutionId, region, operationalStatus, search = '' } = query
    const q = search.trim().toLowerCase()
    return branchRepository
      .list()
      .filter((b) => {
        if (institutionId && b.institutionId !== institutionId) return false
        if (region && b.region !== region) return false
        if (operationalStatus && b.operationalStatus !== operationalStatus) return false
        if (q && !`${b.name} ${b.code} ${b.address} ${b.managerName}`.toLowerCase().includes(q))
          return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async getById(id: string) {
    await latency()
    return branchRepository.byId(id)
  }

  async regions() {
    await latency()
    return [...new Set(branchRepository.list().map((b) => b.region))].sort()
  }
}

export const branchService: BranchService = new MockBranchService()
