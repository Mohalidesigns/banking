/**
 * Fictional branch network (Spec §5.6 / §17.5). Generated deterministically
 * from per-institution seeds so counts always match Institution.branchCount.
 */
import { demoUuid, iso } from '@/mocks/fixtures/demoIds'
import { INSTITUTIONS, INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import type { Branch, BranchStatus, BranchType } from '@/types/institution'
import type { RiskRating } from '@/types/common'

interface BranchSeed {
  count: number
  regions: string[]
  managers: string[]
  riskMix: RiskRating[]
  examRefs?: string[]
}

const SEEDS: Record<string, BranchSeed> = {
  [INST_IDS.meridian]: {
    count: 12,
    regions: ['Northern Metro', 'Capital District', 'Southern Coast', 'Western Provinces', 'Riverine East'],
    managers: ['Yemi Solarin', 'Grace Etim', 'Halima Buhari', 'Victor Chukwu', 'Ruth Antwi'],
    riskMix: ['Low', 'Low', 'Medium', 'Low', 'High', 'Low', 'Medium', 'Low', 'Low', 'Medium', 'Low', 'Low'],
    examRefs: ['EXM-2026-014'],
  },
  [INST_IDS.northstar]: {
    count: 6,
    regions: ['Capital District', 'Northern Metro', 'Southern Coast'],
    managers: ['Tolu Fashola', 'Ifeoma Nnadi', 'Serge Aubry'],
    riskMix: ['Low', 'Medium', 'Low', 'Low', 'Medium', 'Low'],
  },
  [INST_IDS.unity]: {
    count: 8,
    regions: ['Eastern Highlands', 'Riverine East', 'Capital District'],
    managers: ['Zainab Abubakar', 'Emeka Obi', 'Safiya Danjuma', 'Joel Mwangi'],
    riskMix: ['Low', 'Low', 'Low', 'Medium', 'Low', 'Low', 'Low', 'Low'],
    examRefs: ['EXM-2026-021'],
  },
  [INST_IDS.crestline]: {
    count: 3,
    regions: ['Capital District', 'Northern Metro'],
    managers: ['Femi Alabi', 'Lola Achebe', 'Digital Ops Hub'],
    riskMix: ['Medium', 'Low', 'Medium'],
  },
  [INST_IDS.aurora]: { count: 9, regions: ['Southern Coast', 'Riverine East'], managers: ['Bimbo Sekoni', 'Temi Adeleke', 'Nathan Cole'], riskMix: ['Low', 'Low', 'Low', 'Low', 'Medium', 'Low', 'Low', 'Low', 'Low'] },
  [INST_IDS.delta]: { count: 14, regions: ['Riverine East', 'Eastern Highlands', 'Western Provinces'], managers: ['Chidi Okeke', 'Amina Sule', 'Pius Etim', 'Funmi Adewale'], riskMix: ['Low', 'Medium', 'Low', 'Medium', 'Low', 'Low', 'High', 'Low', 'Medium', 'Low', 'Low', 'Medium', 'Low', 'Low'] },
  [INST_IDS.sentinel]: { count: 2, regions: ['Capital District'], managers: ['Priya Raman', 'Custody Operations'], riskMix: ['Low', 'Low'] },
  [INST_IDS.vanguard]: {
    count: 18,
    regions: ['Western Provinces', 'Northern Metro', 'Riverine East', 'Capital District'],
    managers: ['Segun Aluko', 'Mariam Toure', 'Blessing Okoro', 'Ike Nwachukwu', 'Dora Mensah'],
    riskMix: ['High', 'Critical', 'Medium', 'High', 'Medium', 'Low', 'High', 'Medium', 'Critical', 'Medium', 'Low', 'High', 'Medium', 'Low', 'Medium', 'High', 'Medium', 'Low'],
    examRefs: ['EXM-2026-012'],
  },
}

const TYPES: BranchType[] = ['Full Service', 'Full Service', 'Agency', 'Digital Service Point', 'Cash Centre']

const statusFor = (risk: RiskRating, instId: string, i: number): BranchStatus => {
  if (instId === INST_IDS.vanguard && risk === 'Critical') return 'Suspended'
  if (instId === INST_IDS.vanguard && i === 7) return 'Relocating'
  if (instId === INST_IDS.aurora && i === 8) return 'Closed'
  return 'Operational'
}

export const BRANCHES: Branch[] = INSTITUTIONS.flatMap((inst, instIdx) => {
  const seed = SEEDS[inst.id]
  return Array.from({ length: seed.count }, (_, i): Branch => {
    const type: BranchType = i === 0 ? 'Head Office' : TYPES[(instIdx + i) % TYPES.length]
    const risk = seed.riskMix[i % seed.riskMix.length]
    const region = seed.regions[i % seed.regions.length]
    return {
      id: demoUuid(8, instIdx * 100 + i),
      institutionId: inst.id,
      name: i === 0 ? `${inst.tradingName} — Head Office` : `${inst.tradingName} — ${region} Branch ${String(i).padStart(2, '0')}`,
      code: `${inst.code.slice(0, 3)}-BR-${String(i + 1).padStart(3, '0')}`,
      address: `${10 + i * 7} ${['Harbour Road', 'Market Street', 'Ring Way', 'Station Crescent', 'Old Mill Lane'][i % 5]}, ${region}`,
      region,
      type,
      operationalStatus: statusFor(risk, inst.id, i),
      riskClassification: risk,
      openedDate: iso(2012 + ((instIdx + i) % 12), 1 + ((i * 3) % 12), 1 + ((i * 7) % 27)),
      lastVisitDate: risk === 'Low' ? undefined : iso(2026, 1 + (i % 10), 5 + (i % 20)),
      managerName: seed.managers[i % seed.managers.length],
      examinationRefs: i === 0 && seed.examRefs ? seed.examRefs : [],
    }
  })
})
