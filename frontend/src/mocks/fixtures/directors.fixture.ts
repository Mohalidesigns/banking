/**
 * Fictional directors & key officers register (Spec §5.6 / §17.5).
 * Deterministically generated per institution from fictional name pools.
 */
import { demoUuid, iso } from '@/mocks/fixtures/demoIds'
import { INSTITUTIONS, INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import type {
  Director,
  DirectorCategory,
  DirectorStatusEvent,
  FitAndProperStatus,
} from '@/types/institution'

interface PositionSeed {
  position: string
  category: DirectorCategory
  committees: string[]
}

const EXEC_POSITIONS: PositionSeed[] = [
  { position: 'Managing Director / CEO', category: 'Executive', committees: ['Executive Committee', 'Board Risk Committee'] },
  { position: 'Chief Financial Officer', category: 'Executive', committees: ['Executive Committee'] },
  { position: 'Chief Risk Officer', category: 'Key Officer', committees: ['Board Risk Committee'] },
  { position: 'Head of Compliance', category: 'Key Officer', committees: ['Compliance Forum'] },
]

const NON_EXEC_POSITIONS: PositionSeed[] = [
  { position: 'Chairman of the Board', category: 'Non-Executive', committees: ['Board Nominations Committee'] },
  { position: 'Non-Executive Director', category: 'Non-Executive', committees: ['Board Audit Committee'] },
  { position: 'Independent Non-Executive Director', category: 'Independent', committees: ['Board Audit Committee', 'Board Risk Committee'] },
]

const FIRST = ['Adaeze', 'Bolanle', 'Chinedu', 'Damilola', 'Emeka', 'Folake', 'Gambo', 'Hadiza', 'Ifeanyi', 'Josephine', 'Kelechi', 'Lamido', 'Musa', 'Nneka', 'Olumide', 'Patience', 'Qasim', 'Ronke', 'Seyi', 'Titilayo', 'Uche', 'Wale', 'Yakubu', 'Zainab']
const LAST = ['Achebe', 'Balogun', 'Chukwuma', 'Diallo', 'Eze', 'Fagbemi', 'Gwarzo', 'Hadejia', 'Iwegbue', 'Jalloh', 'Kalu', 'Lawal', 'Mbanefo', 'Ndiaye', 'Ogunyemi', 'Popoola', 'Quaye', 'Ramadan', 'Salako', 'Tijjani', 'Udoh', 'Vanjie', 'Yaro', 'Zamani']
const CHAIRS = ['Otunba Femi Gbadamosi', 'Dr. Cecilia Amankwah', 'Alhaji Sule Danmusa', 'Chief Rita Nwodo', 'Prof. Kofi Adjei', 'Barrister Hauwa Liman']

/** Deterministic pick without randomness. */
const pick = <T,>(arr: T[], seed: number): T => arr[Math.abs(seed) % arr.length]

const fpStatusFor = (instId: string, idx: number, category: DirectorCategory): FitAndProperStatus => {
  if (instId === INST_IDS.vanguard) {
    if (idx === 1) return 'Rejected' // CFO approval withdrawn under restructuring
    if (idx === 2) return 'Conditional'
    return idx % 3 === 0 ? 'Under Review' : 'Approved'
  }
  if (instId === INST_IDS.meridian && idx === 3) return 'Conditional'
  if (instId === INST_IDS.northstar && idx === 5) return 'Under Review'
  if (category === 'Independent' && idx % 4 === 3) return 'Pending'
  return 'Approved'
}

const historyFor = (fp: FitAndProperStatus, appointed: string, idx: number): DirectorStatusEvent[] => {
  const events: DirectorStatusEvent[] = [
    { date: appointed, status: 'Appointed', note: 'Appointed to the board / key officer register (demo record).' },
  ]
  if (fp === 'Rejected') {
    events.push({ date: iso(2026, 11, 12), status: 'Suspended', note: 'Fit-and-proper approval withdrawn by the supervisor pending restructuring (demo).' })
  }
  if (fp === 'Conditional') {
    events.push({ date: iso(2026, 5 + (idx % 4), 10), status: 'Conditional', note: 'Approval conditional on completing supervisory training within 6 months (demo).' })
  }
  if (fp === 'Under Review') {
    events.push({ date: iso(2026, 9, 2), status: 'Under Review', note: 'Periodic fit-and-proper re-assessment opened (demo).' })
  }
  return events
}

export const DIRECTORS: Director[] = INSTITUTIONS.flatMap((inst, instIdx) => {
  const positions = [...EXEC_POSITIONS, ...NON_EXEC_POSITIONS]
  const extra = inst.category === 'Commercial Bank' || inst.category === 'Regional Bank' ? 1 : 0
  return positions.slice(0, positions.length).concat(Array.from({ length: extra }, (_, k) => ({
    position: `Non-Executive Director ${k + 2}`,
    category: 'Non-Executive' as DirectorCategory,
    committees: ['Board Audit Committee'],
  }))).map((pos, idx) => {
    const nameSeed = instIdx * 31 + idx * 17
    const fullName =
      pos.position.startsWith('Chairman')
        ? pick(CHAIRS, nameSeed)
        : `${pick(FIRST, nameSeed)} ${pick(LAST, nameSeed + 5)}`
    const appointed = iso(2016 + ((instIdx + idx) % 9), 1 + ((idx * 4) % 12), 1 + ((idx * 9) % 27))
    const fp = fpStatusFor(inst.id, idx, pos.category)
    return {
      id: demoUuid(9, instIdx * 100 + idx),
      institutionId: inst.id,
      fullName,
      position: pos.position,
      category: pos.category,
      appointmentDate: appointed,
      committeeMemberships: pos.committees,
      fitAndProperStatus: fp,
      approvalStatus:
        fp === 'Approved' ? 'Approved' : fp === 'Rejected' ? 'Pending Approval' : 'Conditionally Approved',
      conflictDeclarations: (instIdx + idx) % 3,
      conflictNotes:
        (instIdx + idx) % 3 > 0
          ? 'Declared interest in a fintech vendor; recused from related procurement decisions (demo).'
          : undefined,
      statusHistory: historyFor(fp, appointed, idx),
    }
  })
})
