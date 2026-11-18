/**
 * Supervisory plan detail fixtures (Spec §6.3): activities, resource
 * allocation, changes/deferrals and approval history merged onto the
 * Phase-2A `SUPERVISORY_PLANS` summaries. Activities reference the same
 * story-world examinations (EXM-2026-014 thematic AML, EXM-2026-021
 * governance, EXM-2026-024 added event-driven from alert EWA-2026-011).
 * Demo data only.
 */
import { demoUuid, iso, isoDay } from '@/mocks/fixtures/demoIds'
import { INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import { SUPERVISORY_TEAMS } from '@/mocks/fixtures/people.fixture'
import { SUPERVISORY_PLANS } from '@/mocks/fixtures/supervision.fixture'
import type { PlanActivity, SupervisoryPlanDetail } from '@/types/supervision'

const [TEAM_A, TEAM_B, TEAM_C] = SUPERVISORY_TEAMS

interface ActivitySeed {
  type: PlanActivity['type']
  title: string
  institutionIds: string[]
  team: (typeof SUPERVISORY_TEAMS)[number]
  effortDays: number
  start: string
  end: string
  priority: PlanActivity['priority']
  status: PlanActivity['status']
  progressPct: number
  examinationRef?: string
  deferralReason?: string
}

const act = (n: number, seed: ActivitySeed): PlanActivity => ({
  id: demoUuid(75, n),
  type: seed.type,
  title: seed.title,
  institutionIds: seed.institutionIds,
  teamId: seed.team.id,
  teamName: seed.team.name,
  effortDays: seed.effortDays,
  startDate: seed.start,
  endDate: seed.end,
  priority: seed.priority,
  status: seed.status,
  progressPct: seed.progressPct,
  examinationRef: seed.examinationRef,
  deferralReason: seed.deferralReason,
})

interface PlanSeed {
  cycle: SupervisoryPlanDetail['cycle']
  quarter?: string
  coverageNote: string
  activities: PlanActivity[]
  changes: SupervisoryPlanDetail['changes']
  approvalHistory: SupervisoryPlanDetail['approvalHistory']
}

const PLAN_SEEDS: PlanSeed[] = [
  // 1 — 2026 Annual Supervisory Plan (In Execution, 62%)
  {
    cycle: 'Annual',
    coverageNote:
      'Covers all eight supervised demo institutions. Tier 1 commercial banks receive at least one on-site activity per year; lower-risk categories are covered off-site with examination every 24–36 months (demo coverage standard). The activity list below shows the 10 headline activities of 48 planned (demo extract).',
    activities: [
      act(1, { type: 'Comprehensive examination', title: 'Vanguard Regional Bank — targeted capital & insider lending', institutionIds: [INST_IDS.vanguard], team: TEAM_B, effortDays: 45, start: iso(2026, 6, 1), end: iso(2026, 7, 8), priority: 'Critical', status: 'Completed', progressPct: 100, examinationRef: 'EXM-2026-012' }),
      act(2, { type: 'Comprehensive examination', title: 'Aurora Savings & Loans — routine comprehensive', institutionIds: [INST_IDS.aurora], team: TEAM_A, effortDays: 30, start: iso(2026, 8, 17), end: iso(2026, 9, 22), priority: 'Low', status: 'Completed', progressPct: 100, examinationRef: 'EXM-2026-008' }),
      act(3, { type: 'Comprehensive examination', title: 'Northstar Merchant Bank — capital & treasury review', institutionIds: [INST_IDS.northstar], team: TEAM_B, effortDays: 32, start: iso(2026, 5, 4), end: iso(2026, 6, 19), priority: 'Medium', status: 'Completed', progressPct: 100, examinationRef: 'EXM-2026-009' }),
      act(4, { type: 'Thematic review', title: 'Crestline Payment Bank — cyber resilience review', institutionIds: [INST_IDS.crestline], team: TEAM_B, effortDays: 28, start: iso(2026, 2, 9), end: iso(2026, 3, 20), priority: 'Medium', status: 'In Progress', progressPct: 92, examinationRef: 'EXM-2026-005' }),
      act(5, { type: 'Thematic review', title: 'Meridian Commercial Bank — AML/CFT thematic', institutionIds: [INST_IDS.meridian], team: TEAM_C, effortDays: 38, start: isoDay(-15), end: isoDay(12), priority: 'Critical', status: 'In Progress', progressPct: 58, examinationRef: 'EXM-2026-014' }),
      act(6, { type: 'Follow-up visit', title: 'Delta Microfinance Bank — credit remediation follow-up', institutionIds: [INST_IDS.delta], team: TEAM_C, effortDays: 12, start: isoDay(-6), end: isoDay(8), priority: 'Medium', status: 'In Progress', progressPct: 41, examinationRef: 'EXM-2026-017' }),
      act(7, { type: 'Comprehensive examination', title: 'Unity Non-Interest Bank — corporate governance', institutionIds: [INST_IDS.unity], team: TEAM_C, effortDays: 26, start: isoDay(21), end: isoDay(56), priority: 'Low', status: 'Planned', progressPct: 0, examinationRef: 'EXM-2026-021' }),
      act(8, { type: 'Off-site review', title: 'Sentinel Custody & Trust — annual off-site review', institutionIds: [INST_IDS.sentinel], team: TEAM_A, effortDays: 8, start: iso(2026, 11, 2), end: iso(2026, 11, 13), priority: 'Low', status: 'Planned', progressPct: 0 }),
      act(9, { type: 'Risk assessment', title: 'Crestline Payment Bank — 2026 risk assessment', institutionIds: [INST_IDS.crestline], team: TEAM_B, effortDays: 10, start: isoDay(-20), end: isoDay(12), priority: 'Medium', status: 'In Progress', progressPct: 50 }),
      act(10, { type: 'Management meeting', title: 'Vanguard Regional Bank — restructuring oversight (monthly)', institutionIds: [INST_IDS.vanguard], team: TEAM_B, effortDays: 2, start: isoDay(5), end: isoDay(5), priority: 'Critical', status: 'Planned', progressPct: 0 }),
    ],
    changes: [
      { id: demoUuid(76, 1), at: iso(2026, 8, 20), type: 'Deferral', description: 'Unity governance examination deferred from Q3 to Q4 2026 — specialist reviewer availability (demo deferral).', byName: 'Lerato Mokoena' },
      { id: demoUuid(76, 2), at: iso(2026, 10, 2), type: 'Addition', description: 'Meridian AML thematic (EXM-2026-014) inserted after CAP-2026-003 passed its due date and ENF-2026-001 opened (event-driven addition to the annual cycle).', byName: 'Amara Osei' },
    ],
    approvalHistory: [
      { id: demoUuid(77, 1), at: iso(2025, 12, 5), actorName: 'Amara Osei', action: 'Submitted', comment: '48 activities across 8 institutions; effort envelope within the demo staffing model.' },
      { id: demoUuid(77, 2), at: iso(2025, 12, 18), actorName: 'Tunde Bakare', action: 'Approved', comment: 'Approved for 2026 execution; quarterly re-forecasting required.' },
    ],
  },
  // 2 — Q4 2026 Thematic Cycle (In Execution, 42%)
  {
    cycle: 'Quarterly',
    quarter: 'Q4 2026',
    coverageNote:
      'Quarterly thematic cycle covering AML and cyber resilience for the three highest-exposure demo institutions. 5 of 12 activities complete (demo).',
    activities: [
      act(11, { type: 'Thematic review', title: 'Meridian AML/CFT thematic fieldwork', institutionIds: [INST_IDS.meridian], team: TEAM_C, effortDays: 38, start: isoDay(-15), end: isoDay(12), priority: 'Critical', status: 'In Progress', progressPct: 58, examinationRef: 'EXM-2026-014' }),
      act(12, { type: 'Thematic review', title: 'Crestline cyber resilience — report approval & follow-up', institutionIds: [INST_IDS.crestline], team: TEAM_B, effortDays: 6, start: isoDay(-2), end: isoDay(9), priority: 'High', status: 'In Progress', progressPct: 92, examinationRef: 'EXM-2026-005' }),
      act(13, { type: 'Targeted examination', title: 'Northstar liquidity — event-driven insertion from EWA-2026-011', institutionIds: [INST_IDS.northstar], team: TEAM_B, effortDays: 18, start: isoDay(9), end: isoDay(30), priority: 'High', status: 'Planned', progressPct: 0, examinationRef: 'EXM-2026-024' }),
      act(14, { type: 'Off-site review', title: 'Portfolio-wide AML return data sweep (demo off-site work)', institutionIds: [INST_IDS.meridian, INST_IDS.northstar, INST_IDS.crestline], team: TEAM_C, effortDays: 5, start: iso(2026, 10, 5), end: iso(2026, 10, 9), priority: 'Medium', status: 'Completed', progressPct: 100 }),
    ],
    changes: [
      { id: demoUuid(76, 11), at: isoDay(-2), type: 'Addition', description: 'EXM-2026-024 added to the Q4 cycle after early-warning alert EWA-2026-011 (LCR amber) was converted to a targeted examination (demo).', byName: 'Fatima Bello' },
    ],
    approvalHistory: [
      { id: demoUuid(77, 11), at: iso(2026, 9, 25), actorName: 'Chuka Eze', action: 'Submitted' },
      { id: demoUuid(77, 12), at: iso(2026, 9, 30), actorName: 'Amara Osei', action: 'Approved', comment: 'Event-driven insertions permitted within the quarterly envelope (demo).' },
    ],
  },
  // 3 — 2027 Draft Supervisory Plan (Draft)
  {
    cycle: 'Annual',
    coverageNote:
      'Draft 2027 cycle: 52 provisional activities (demo). Agency-banking channel review deferred from 2026 is included for Meridian; methodology v4.0 assessments will drive the January risk-refresh.',
    activities: [
      act(21, { type: 'Risk assessment', title: 'Portfolio-wide 2027 risk assessments (methodology v4.0, pending approval)', institutionIds: Object.values(INST_IDS), team: TEAM_A, effortDays: 40, start: iso(2027, 1, 11), end: iso(2027, 3, 26), priority: 'High', status: 'Planned', progressPct: 0 }),
      act(22, { type: 'Thematic review', title: 'Meridian agency-banking AML channel review (deferred from 2026)', institutionIds: [INST_IDS.meridian], team: TEAM_C, effortDays: 20, start: iso(2027, 2, 1), end: iso(2027, 2, 26), priority: 'High', status: 'Planned', progressPct: 0 }),
      act(23, { type: 'Comprehensive examination', title: 'Vanguard restructuring exit assessment (contingent on CAP-2026-007)', institutionIds: [INST_IDS.vanguard], team: TEAM_B, effortDays: 35, start: iso(2027, 3, 1), end: iso(2027, 4, 16), priority: 'Critical', status: 'Planned', progressPct: 0 }),
    ],
    changes: [],
    approvalHistory: [
      { id: demoUuid(77, 21), at: isoDay(-9), actorName: 'Amara Osei', action: 'Amended', comment: 'Draft circulated to team leads for effort estimates (demo).' },
    ],
  },
]

export const buildPlanDetail = (index: number, base: (typeof SUPERVISORY_PLANS)[number]): SupervisoryPlanDetail => {
  const seed = PLAN_SEEDS[index]
  if (!seed) throw new Error(`demo plan seed missing at index ${index}`)
  return {
    ...base,
    cycle: seed.cycle,
    quarter: seed.quarter,
    coverageNote: seed.coverageNote,
    activities: seed.activities,
    resourceAllocation: [TEAM_A, TEAM_B, TEAM_C].map((team) => {
      const days = seed.activities
        .filter((a) => a.teamId === team.id)
        .reduce((sum, a) => sum + a.effortDays, 0)
      return {
        teamId: team.id,
        teamName: team.name,
        allocatedDays: days,
        utilisationPct: Math.min(100, Math.round((days / 180) * 100)),
      }
    }),
    changes: seed.changes,
    approvalHistory: seed.approvalHistory,
  }
}
