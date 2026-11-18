/**
 * Demo identity fixtures (Spec §17.5 fictional people, §19 role matrix —
 * one demo identity per role). Fixtures are ONLY consumed by mock
 * repositories, never by components.
 */
import { demoUuid } from '@/mocks/fixtures/demoIds'
import type { DemoUser, Jurisdiction } from '@/types/auth'

export const JURISDICTIONS: Jurisdiction[] = [
  {
    id: '9f1c2a3e-5b7d-4e21-9a04-1c2d3e4f5a60',
    code: 'MBA',
    name: 'Meridia Banking Authority',
    authority: 'Banking Supervision Department',
  },
  {
    id: '2b8d4c6f-1e3a-4f57-8c92-6d5e4f3a2b10',
    code: 'NSPA',
    name: 'Northstar Prudential Authority',
    authority: 'Prudential Supervision Division',
  },
  {
    id: '7e6f5a4b-3c2d-4e19-8f01-9a8b7c6d5e40',
    code: 'UFC',
    name: 'Unity Financial Commission',
    authority: 'Non-Interest Banking Supervision',
  },
]

const ALL_JURISDICTIONS = JURISDICTIONS.map((j) => j.id)
const MBA_ONLY = [JURISDICTIONS[0].id]

/**
 * The 17 Spec §19 demo roles, one identity each. Regulator identities use
 * the fictional @meridia-central.gov domain; institution identities use
 * their fictional bank domains and carry a portal context (portal codes
 * MCB-001 / NMB-002 / CPB-004 work on the portal sign-in).
 */
export const DEMO_USERS: DemoUser[] = [
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a6',
    fullName: 'Samuel Tunde',
    email: 'samuel.tunde@meridia-central.gov',
    initials: 'ST',
    jobTitle: 'System Administrator',
    role: 'system-administrator',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a1',
    fullName: 'Amara Osei',
    email: 'amara.osei@meridia-central.gov',
    initials: 'AO',
    jobTitle: 'Director of Supervision',
    role: 'director-of-supervision',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: demoUuid(12, 14),
    fullName: 'Tunde Bakare',
    email: 'tunde.bakare@meridia-central.gov',
    initials: 'TB',
    jobTitle: 'Deputy Director, Banking Supervision',
    role: 'deputy-director',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: demoUuid(12, 12),
    fullName: 'Lerato Mokoena',
    email: 'lerato.mokoena@meridia-central.gov',
    initials: 'LM',
    jobTitle: 'Assistant Director, Specialised Institutions',
    role: 'assistant-director',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a2',
    fullName: 'Daniel Adeyemi',
    email: 'daniel.adeyemi@meridia-central.gov',
    initials: 'DA',
    jobTitle: 'Supervisory Team Lead, Team A',
    role: 'supervisory-team-lead',
    jurisdictionIds: [JURISDICTIONS[0].id, JURISDICTIONS[1].id],
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a4',
    fullName: 'Chuka Eze',
    email: 'chuka.eze@meridia-central.gov',
    initials: 'CE',
    jobTitle: 'Principal Examiner, Team B Lead',
    role: 'principal-examiner',
    jurisdictionIds: [JURISDICTIONS[0].id, JURISDICTIONS[2].id],
  },
  {
    id: demoUuid(12, 7),
    fullName: 'Nkechi Balogun',
    email: 'nkechi.balogun@meridia-central.gov',
    initials: 'NB',
    jobTitle: 'Examiner, Banking Supervision Team A',
    role: 'examiner',
    jurisdictionIds: MBA_ONLY,
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a3',
    fullName: 'Fatima Bello',
    email: 'fatima.bello@meridia-central.gov',
    initials: 'FB',
    jobTitle: 'Prudential Analyst, Off-Site Surveillance',
    role: 'prudential-analyst',
    jurisdictionIds: MBA_ONLY,
  },
  {
    id: demoUuid(12, 9),
    fullName: 'Aisha Yusuf',
    email: 'aisha.yusuf@meridia-central.gov',
    initials: 'AY',
    jobTitle: 'Risk Analyst, Risk-Based Supervision',
    role: 'risk-analyst',
    jurisdictionIds: MBA_ONLY,
  },
  {
    id: demoUuid(12, 10),
    fullName: 'Kwame Mensah',
    email: 'kwame.mensah@meridia-central.gov',
    initials: 'KM',
    jobTitle: 'Cybersecurity Specialist',
    role: 'cybersecurity-specialist',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: demoUuid(12, 11),
    fullName: 'Hauwa Sadiq',
    email: 'hauwa.sadiq@meridia-central.gov',
    initials: 'HS',
    jobTitle: 'AML Specialist',
    role: 'aml-specialist',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a5',
    fullName: 'Zainab Lawal',
    email: 'zainab.lawal@meridia-central.gov',
    initials: 'ZL',
    jobTitle: 'Legal/Enforcement Officer',
    role: 'legal-enforcement-officer',
    jurisdictionIds: MBA_ONLY,
  },
  {
    id: demoUuid(12, 13),
    fullName: 'Samuel Ike',
    email: 'samuel.ike@meridia-central.gov',
    initials: 'SI',
    jobTitle: 'Report Reviewer, Quality & Standards',
    role: 'report-reviewer',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: demoUuid(13, 14),
    fullName: 'Bisi Ogundipe',
    email: 'bisi.ogundipe@meridia-central.gov',
    initials: 'BO',
    jobTitle: 'Read-Only Supervisor (observer persona)',
    role: 'read-only-supervisor',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221b1',
    fullName: 'Grace Mbeki',
    email: 'grace.mbeki@meridianbank.demo',
    initials: 'GM',
    jobTitle: 'Head of Regulatory Reporting',
    role: 'institution-administrator',
    jurisdictionIds: [],
    portal: {
      // Mirrors INST_IDS.meridian (institutions.fixture) without a circular import.
      institutionId: demoUuid(1, 1),
      institutionCode: 'MCB-001',
      institutionName: 'Meridian Commercial Bank',
    },
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221b2',
    fullName: 'Ibrahim Sani',
    email: 'ibrahim.sani@northstarbank.demo',
    initials: 'IS',
    jobTitle: 'Compliance Officer',
    role: 'institution-submitter',
    jurisdictionIds: [],
    portal: {
      // Mirrors INST_IDS.northstar (institutions.fixture) without a circular import.
      institutionId: demoUuid(1, 2),
      institutionCode: 'NMB-002',
      institutionName: 'Northstar Merchant Bank',
    },
  },
  {
    id: demoUuid(13, 17),
    fullName: 'Zara Nwosu',
    email: 'zara.nwosu@crestlinepay.demo',
    initials: 'ZN',
    jobTitle: 'Finance Manager (view-only persona)',
    role: 'institution-viewer',
    jurisdictionIds: [],
    portal: {
      // Mirrors INST_IDS.crestline (institutions.fixture) without a circular import.
      institutionId: demoUuid(1, 4),
      institutionCode: 'CPB-004',
      institutionName: 'Crestline Payment Bank',
    },
  },
]

/** Default regulator identity used when a sign-in email is not a known demo user. */
export const DEFAULT_REGULATOR_USER = DEMO_USERS.find(
  (u) => u.role === 'director-of-supervision',
)!
