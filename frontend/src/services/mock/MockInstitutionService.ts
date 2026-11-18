import { institutionRepository } from '@/mocks/repositories/institutionRepository'
import { SUPERVISORY_TEAMS } from '@/mocks/fixtures/people.fixture'
import type {
  InstitutionService,
  SupervisoryTeamOption,
} from '@/services/contracts/InstitutionService'
import type { Paginated } from '@/types/common'
import type {
  CreateInstitutionInput,
  Institution,
  InstitutionQuery,
  UpdateInstitutionInput,
} from '@/types/institution'

const LATENCY_MS = 180
const latency = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))

/** Sort key extraction for the registry table (Spec §5.4 sortable columns). */
const sortValue = (inst: Institution, key: string): string | number => {
  switch (key) {
    case 'legalName':
      return inst.legalName
    case 'code':
      return inst.code
    case 'category':
      return inst.category
    case 'riskRating':
      return { Critical: 0, High: 1, Medium: 2, Low: 3 }[inst.riskRating]
    case 'supervisoryRating':
      return inst.supervisoryRating
    case 'licenceStatus':
      return inst.licenceStatus
    case 'lastExaminationDate':
      return inst.lastExaminationDate ?? ''
    case 'openFindingsCount':
      return inst.openFindingsCount
    case 'portfolioStatus':
      return inst.portfolioStatus
    case 'totalAssetsMM':
      return Number(inst.totalAssetsMM)
    default:
      return inst.legalName
  }
}

export class MockInstitutionService implements InstitutionService {
  async list(query: InstitutionQuery = {}): Promise<Paginated<Institution>> {
    await latency()
    const {
      page = 1,
      pageSize = 10,
      search = '',
      category = '',
      licenceStatus = '',
      riskRating = '',
      teamId,
      region,
      sortBy = 'legalName',
      sortDir = 'asc',
    } = query

    const q = search.trim().toLowerCase()
    let items = institutionRepository.list().filter((i) => {
      if (q) {
        const haystack = `${i.legalName} ${i.tradingName} ${i.code} ${i.licenceNumber}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (category && i.category !== category) return false
      if (licenceStatus && i.licenceStatus !== licenceStatus) return false
      if (riskRating) {
        const allowed = riskRating.split(',').map((r) => r.trim())
        if (!allowed.includes(i.riskRating)) return false
      }
      if (teamId && i.supervisory.teamId !== teamId) return false
      if (region && i.region !== region) return false
      return true
    })

    items = [...items].sort((a, b) => {
      const av = sortValue(a, sortBy)
      const bv = sortValue(b, sortBy)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'desc' ? -cmp : cmp
    })

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(Math.max(1, page), totalPages)
    const paged = items.slice((safePage - 1) * pageSize, safePage * pageSize)
    return { items: paged, total, page: safePage, pageSize, totalPages }
  }

  async getById(id: string): Promise<Institution> {
    await latency()
    const found = institutionRepository.byId(id)
    if (!found) throw new Error(`Institution ${id} not found in the demo dataset.`)
    return found
  }

  async create(input: CreateInstitutionInput): Promise<Institution> {
    await latency()
    if (institutionRepository.isCodeTaken(input.code)) {
      throw new Error(`Institution code ${input.code} is already in use within this regulator.`)
    }
    return institutionRepository.create(input)
  }

  async update(id: string, input: UpdateInstitutionInput): Promise<Institution> {
    await latency()
    if (input.code && institutionRepository.isCodeTaken(input.code, id)) {
      throw new Error(`Institution code ${input.code} is already in use within this regulator.`)
    }
    const updated = institutionRepository.update(id, input)
    if (!updated) throw new Error(`Institution ${id} not found in the demo dataset.`)
    return updated
  }

  async assignTeam(id: string, teamId: string): Promise<Institution> {
    await latency()
    const team = SUPERVISORY_TEAMS.find((t) => t.id === teamId)
    if (!team) throw new Error(`Team ${teamId} not found in the demo dataset.`)
    const updated = institutionRepository.update(id, {
      supervisory: {
        department: team.department,
        portfolio: institutionRepository.byId(id)?.supervisory.portfolio ?? 'General Portfolio',
        leadSupervisorId: institutionRepository.byId(id)?.supervisory.leadSupervisorId ?? '',
        leadSupervisorName: team.leadName,
        teamId: team.id,
        teamName: team.name,
      },
    })
    if (!updated) throw new Error(`Institution ${id} not found in the demo dataset.`)
    institutionRepository.addActivity({
      institutionId: id,
      type: 'institution',
      title: `Supervisory team assigned — ${team.name}`,
      detail: 'Team assignment changed in this prototype session (demo action).',
      actor: 'Prototype session',
      at: new Date().toISOString(),
    })
    return updated
  }

  async isCodeAvailable(code: string, exceptId?: string): Promise<boolean> {
    await latency()
    return !institutionRepository.isCodeTaken(code, exceptId)
  }

  async listTeams(): Promise<SupervisoryTeamOption[]> {
    await latency()
    return SUPERVISORY_TEAMS.map((t) => ({
      id: t.id,
      name: t.name,
      department: t.department,
      leadName: t.leadName,
    }))
  }

  async shareholders(institutionId: string) {
    await latency()
    return institutionRepository.shareholders(institutionId)
  }

  async documents(institutionId: string) {
    await latency()
    return institutionRepository.documents(institutionId)
  }

  async ratingDimensions(institutionId: string) {
    await latency()
    return institutionRepository.ratingDimensions(institutionId)
  }

  async financials(institutionId: string) {
    await latency()
    return institutionRepository.financials(institutionId)
  }

  async activity(institutionId?: string) {
    await latency()
    return institutionRepository.activity(institutionId)
  }

  async listGroups() {
    await latency()
    return institutionRepository.groups()
  }

  async groupsForInstitution(institutionId: string) {
    await latency()
    return institutionRepository.groupsForInstitution(institutionId)
  }
}

export const institutionService: InstitutionService = new MockInstitutionService()
