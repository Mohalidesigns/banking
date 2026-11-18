/**
 * Fictional regulator staff and supervisory teams (Spec §17.5).
 * Consumed only by mock repositories/services — never by components.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'

export interface StaffMember {
  id: string
  fullName: string
  initials: string
  jobTitle: string
  email: string
  teamId?: string
}

export interface SupervisoryTeam {
  id: string
  name: string
  department: string
  leadName: string
  memberNames: string[]
}

export const SUPERVISORY_TEAMS: SupervisoryTeam[] = [
  {
    id: demoUuid(11, 1),
    name: 'Banking Supervision Team A',
    department: 'Banking Supervision Department',
    leadName: 'Daniel Adeyemi',
    memberNames: ['Daniel Adeyemi', 'Nkechi Balogun', 'Peter Okonjo', 'Tunde Bakare'],
  },
  {
    id: demoUuid(11, 2),
    name: 'Banking Supervision Team B',
    department: 'Banking Supervision Department',
    leadName: 'Chuka Eze',
    memberNames: ['Chuka Eze', 'Aisha Yusuf', 'Kwame Mensah', 'Fatima Bello'],
  },
  {
    id: demoUuid(11, 3),
    name: 'Specialised Institutions Team',
    department: 'Specialised & Inclusive Finance Supervision',
    leadName: 'Lerato Mokoena',
    memberNames: ['Lerato Mokoena', 'Samuel Ike', 'Hauwa Sadiq'],
  },
]

export const STAFF: StaffMember[] = [
  { id: '5a4b3c2d-1e0f-4a98-8776-6554433221a1', fullName: 'Amara Osei', initials: 'AO', jobTitle: 'Director of Supervision', email: 'amara.osei@meridia-central.gov' },
  { id: '5a4b3c2d-1e0f-4a98-8776-6554433221a2', fullName: 'Daniel Adeyemi', initials: 'DA', jobTitle: 'Supervisory Team Lead, Team A', email: 'daniel.adeyemi@meridia-central.gov', teamId: SUPERVISORY_TEAMS[0].id },
  { id: '5a4b3c2d-1e0f-4a98-8776-6554433221a3', fullName: 'Fatima Bello', initials: 'FB', jobTitle: 'Prudential Analyst', email: 'fatima.bello@meridia-central.gov', teamId: SUPERVISORY_TEAMS[1].id },
  { id: '5a4b3c2d-1e0f-4a98-8776-6554433221a4', fullName: 'Chuka Eze', initials: 'CE', jobTitle: 'Principal Examiner, Team B Lead', email: 'chuka.eze@meridia-central.gov', teamId: SUPERVISORY_TEAMS[1].id },
  { id: '5a4b3c2d-1e0f-4a98-8776-6554433221a5', fullName: 'Zainab Lawal', initials: 'ZL', jobTitle: 'Legal/Enforcement Officer', email: 'zainab.lawal@meridia-central.gov' },
  { id: '5a4b3c2d-1e0f-4a98-8776-6554433221a6', fullName: 'Samuel Tunde', initials: 'ST', jobTitle: 'System Administrator', email: 'samuel.tunde@meridia-central.gov' },
  { id: demoUuid(12, 7), fullName: 'Nkechi Balogun', initials: 'NB', jobTitle: 'Examiner', email: 'nkechi.balogun@meridia-central.gov', teamId: SUPERVISORY_TEAMS[0].id },
  { id: demoUuid(12, 8), fullName: 'Peter Okonjo', initials: 'PO', jobTitle: 'Examiner', email: 'peter.okonjo@meridia-central.gov', teamId: SUPERVISORY_TEAMS[0].id },
  { id: demoUuid(12, 9), fullName: 'Aisha Yusuf', initials: 'AY', jobTitle: 'Risk Analyst', email: 'aisha.yusuf@meridia-central.gov', teamId: SUPERVISORY_TEAMS[1].id },
  { id: demoUuid(12, 10), fullName: 'Kwame Mensah', initials: 'KM', jobTitle: 'Cybersecurity Specialist', email: 'kwame.mensah@meridia-central.gov', teamId: SUPERVISORY_TEAMS[1].id },
  { id: demoUuid(12, 11), fullName: 'Hauwa Sadiq', initials: 'HS', jobTitle: 'AML Specialist', email: 'hauwa.sadiq@meridia-central.gov', teamId: SUPERVISORY_TEAMS[2].id },
  { id: demoUuid(12, 12), fullName: 'Lerato Mokoena', initials: 'LM', jobTitle: 'Assistant Director, Specialised Institutions', email: 'lerato.mokoena@meridia-central.gov', teamId: SUPERVISORY_TEAMS[2].id },
  { id: demoUuid(12, 13), fullName: 'Samuel Ike', initials: 'SI', jobTitle: 'Report Reviewer', email: 'samuel.ike@meridia-central.gov', teamId: SUPERVISORY_TEAMS[2].id },
  { id: demoUuid(12, 14), fullName: 'Tunde Bakare', initials: 'TB', jobTitle: 'Deputy Director (Retired demo persona)', email: 'tunde.bakare@meridia-central.gov', teamId: SUPERVISORY_TEAMS[0].id },
]

export const staffByName = (name: string): StaffMember | undefined =>
  STAFF.find((s) => s.fullName === name)

export const teamByName = (name: string): SupervisoryTeam | undefined =>
  SUPERVISORY_TEAMS.find((t) => t.name === name)
