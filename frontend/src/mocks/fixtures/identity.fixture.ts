/**
 * Demo identity fixtures (Spec §17.5 — fictional institutions and people).
 * Fixtures are ONLY consumed by mock repositories, never by components.
 */
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

export const DEMO_USERS: DemoUser[] = [
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a1',
    fullName: 'Amara Osei',
    email: 'amara.osei@meridia-central.gov',
    initials: 'AO',
    jobTitle: 'Supervisor-General',
    role: 'supervisor-general',
    jurisdictionIds: ALL_JURISDICTIONS,
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a2',
    fullName: 'Daniel Adeyemi',
    email: 'daniel.adeyemi@meridia-central.gov',
    initials: 'DA',
    jobTitle: 'Lead Supervisor, Banking Supervision Department',
    role: 'lead-supervisor',
    jurisdictionIds: [JURISDICTIONS[0].id, JURISDICTIONS[1].id],
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a3',
    fullName: 'Fatima Bello',
    email: 'fatima.bello@meridia-central.gov',
    initials: 'FB',
    jobTitle: 'Off-Site Surveillance Analyst',
    role: 'offsite-analyst',
    jurisdictionIds: [JURISDICTIONS[0].id],
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a4',
    fullName: 'Chuka Eze',
    email: 'chuka.eze@meridia-central.gov',
    initials: 'CE',
    jobTitle: 'Examination Manager',
    role: 'examination-manager',
    jurisdictionIds: [JURISDICTIONS[0].id, JURISDICTIONS[2].id],
  },
  {
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221a5',
    fullName: 'Zainab Lawal',
    email: 'zainab.lawal@meridia-central.gov',
    initials: 'ZL',
    jobTitle: 'Enforcement & Legal Officer',
    role: 'enforcement-officer',
    jurisdictionIds: [JURISDICTIONS[0].id],
  },
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
    id: '5a4b3c2d-1e0f-4a98-8776-6554433221b1',
    fullName: 'Grace Mbeki',
    email: 'grace.mbeki@meridianbank.demo',
    initials: 'GM',
    jobTitle: 'Head of Regulatory Reporting',
    role: 'institution-user',
    jurisdictionIds: [],
    portal: {
      institutionId: 'inst-meridian-commercial-bank',
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
    role: 'institution-user',
    jurisdictionIds: [],
    portal: {
      institutionId: 'inst-northstar-merchant-bank',
      institutionCode: 'NMB-002',
      institutionName: 'Northstar Merchant Bank',
    },
  },
]

/** Default regulator identity used when a sign-in email is not a known demo user. */
export const DEFAULT_REGULATOR_USER = DEMO_USERS[0]
