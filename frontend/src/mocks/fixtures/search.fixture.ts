/**
 * Searchable demo entities (Spec §17.5 — derived from the one coherent
 * dataset so global search always matches the live records). Consumed only
 * by the mock search service.
 */
import { INSTITUTIONS } from '@/mocks/fixtures/institutions.fixture'
import {
  REGULATORY_CORRESPONDENCE,
  REGULATORY_FRAMEWORKS,
  REGULATORY_OBLIGATIONS,
} from '@/mocks/fixtures/regulatory.fixture'
import {
  SPECIALIST_ASSESSMENTS,
  SPECIALIST_DOMAINS,
} from '@/mocks/fixtures/specialist.fixture'
import {
  ENFORCEMENT_CASES,
  EXAMINATIONS,
  FINDINGS,
  RETURN_SUBMISSIONS,
} from '@/mocks/fixtures/supervision.fixture'
import type { SearchResultItem } from '@/services/contracts/SearchService'

const instName = (id: string): string =>
  INSTITUTIONS.find((i) => i.id === id)?.tradingName ?? 'Unknown institution'

export const SEARCH_RECORDS: SearchResultItem[] = [
  ...INSTITUTIONS.map((i): SearchResultItem => ({
    id: i.id,
    group: 'Institutions',
    title: i.tradingName,
    subtitle: `${i.code} · ${i.category} · Fictional demo institution`,
    path: `/app/institutions/${i.id}`,
  })),
  ...EXAMINATIONS.map((e): SearchResultItem => ({
    id: e.id,
    group: 'Examinations',
    title: `${e.reference} — ${e.type} examination`,
    subtitle: `${instName(e.institutionId)} · ${e.status} · Demo record`,
    path: `/app/examinations/${e.id}`,
  })),
  ...FINDINGS.map((f): SearchResultItem => ({
    id: f.id,
    group: 'Findings',
    title: `${f.reference} — ${f.title}`,
    subtitle: `${instName(f.institutionId)} · ${f.riskRating} risk · Demo record`,
    path: `/app/findings/${f.id}`,
  })),
  ...RETURN_SUBMISSIONS.map((r): SearchResultItem => ({
    id: r.id,
    group: 'Returns',
    title: `${r.returnCode} ${r.returnName} — ${r.period}`,
    subtitle: `${instName(r.institutionId)} · ${r.status} · Demo record`,
    path: `/app/returns/${r.id}`,
  })),
  {
    id: 'dir-2026-004',
    group: 'Directives',
    title: 'DIR-2026-004 — Corrective directive: AML remediation',
    subtitle: `${instName(INSTITUTIONS[0].id)} · Open · Demo record`,
    path: '/app/directives',
  },
  {
    id: 'dir-2026-002',
    group: 'Directives',
    title: 'DIR-2026-002 — Liquidity buffer directive',
    subtitle: `${instName(INSTITUTIONS[1].id)} · Monitoring · Demo record`,
    path: '/app/directives',
  },
  ...ENFORCEMENT_CASES.map((c): SearchResultItem => ({
    id: c.id,
    group: 'Directives',
    title: `${c.reference} — ${c.title}`,
    subtitle: `${instName(c.institutionId)} · ${c.status} · Demo record`,
    path: `/app/enforcement/${c.id}`,
  })),
  {
    id: 'rpt-fsib-2026-q3',
    group: 'Reports',
    title: 'Financial Stability Insight Brief — Q3 2026',
    subtitle: 'Industry intelligence · Illustrative demo report',
    path: '/app/reports',
  },
  {
    id: 'rpt-peer-payments-2026',
    group: 'Reports',
    title: 'Peer Benchmarking: Payment Service Banks 2026',
    subtitle: 'Peer benchmarking · Illustrative demo report',
    path: '/app/peer-benchmarking',
  },
  // Prudential supervision (Phase 3B) — screens and story indicators.
  {
    id: 'pru-capital',
    group: 'Prudential',
    title: 'Capital Adequacy',
    subtitle: 'Prudential supervision · Illustrative demo module',
    path: '/app/prudential/capital',
  },
  {
    id: 'pru-credit',
    group: 'Prudential',
    title: 'Credit & Asset Quality',
    subtitle: 'Prudential supervision · Illustrative demo module',
    path: '/app/prudential/credit',
  },
  {
    id: 'pru-liquidity',
    group: 'Prudential',
    title: 'Liquidity & Treasury',
    subtitle: 'Prudential supervision · Illustrative demo module',
    path: '/app/prudential/liquidity',
  },
  {
    id: 'pru-stress-testing',
    group: 'Prudential',
    title: 'Stress Testing',
    subtitle: 'Prudential supervision · Illustrative demo scenarios only',
    path: '/app/prudential/stress-testing',
  },
  {
    id: 'pru-indicators',
    group: 'Prudential',
    title: 'Prudential Indicators',
    subtitle: 'Configurable indicator catalogue · Demo thresholds',
    path: '/app/prudential/indicators',
  },
  {
    id: 'pru-ind-car',
    group: 'Prudential',
    title: 'CAR — Capital Adequacy Ratio',
    subtitle: `Prudential indicator · ${instName(INSTITUTIONS[7].id)} breach story (EWA-2026-008)`,
    path: '/app/prudential/indicators?indicator=CAR',
  },
  {
    id: 'pru-ind-lcr',
    group: 'Prudential',
    title: 'LCR — Liquidity Coverage Ratio',
    subtitle: `Prudential indicator · ${instName(INSTITUTIONS[1].id)} amber story (EWA-2026-011)`,
    path: '/app/prudential/indicators?indicator=LCR',
  },
  {
    id: 'pru-ind-npl',
    group: 'Prudential',
    title: 'NPL — Non-Performing Loan Ratio',
    subtitle: `Prudential indicator · ${instName(INSTITUTIONS[0].id)} amber story (EWA-2026-013)`,
    path: '/app/prudential/indicators?indicator=NPL',
  },
  // Regulatory administration (Phase 4A) — screens plus the framework,
  // obligation and correspondence story records (§10).
  {
    id: 'reg-frameworks',
    group: 'Regulatory',
    title: 'Regulatory Frameworks',
    subtitle: 'Framework library · Illustrative demo module',
    path: '/app/regulatory/frameworks',
  },
  {
    id: 'reg-obligations',
    group: 'Regulatory',
    title: 'Regulatory Obligations',
    subtitle: 'Obligation register · Illustrative demo module',
    path: '/app/regulatory/obligations',
  },
  {
    id: 'reg-correspondence',
    group: 'Regulatory',
    title: 'Regulatory Correspondence',
    subtitle: 'Official correspondence register · Illustrative demo module',
    path: '/app/regulatory/correspondence',
  },
  ...REGULATORY_FRAMEWORKS.map((f): SearchResultItem => ({
    id: f.id,
    group: 'Regulatory',
    title: `${f.code} — ${f.name}`,
    subtitle: `${f.category} · ${f.status} · Demo framework`,
    path: `/app/regulatory/frameworks?framework=${encodeURIComponent(f.code)}`,
  })),
  ...REGULATORY_OBLIGATIONS.map((o): SearchResultItem => ({
    id: o.id,
    group: 'Regulatory',
    title: `${o.reference} — ${o.title}`,
    subtitle: `${o.responsibleDepartment} · ${o.frequency} · Demo obligation`,
    path: `/app/regulatory/obligations?obligation=${encodeURIComponent(o.reference)}`,
  })),
  ...REGULATORY_CORRESPONDENCE.map((c): SearchResultItem => ({
    id: c.id,
    group: 'Regulatory',
    title: `${c.reference} — ${c.subject}`,
    subtitle: `${instName(c.institutionId)} · ${c.type} · ${c.status} · Demo correspondence`,
    path: `/app/regulatory/correspondence?correspondence=${encodeURIComponent(c.reference)}`,
  })),
  // Phase 4B — specialist supervision (§9): the three live domain screens
  // plus the seeded governance/ERM/cybersecurity assessments.
  {
    id: 'spec-governance',
    group: 'Specialist',
    title: 'Corporate Governance',
    subtitle: 'Specialist supervision §9.1 · Illustrative demo module',
    path: '/app/specialist/governance',
  },
  {
    id: 'spec-erm',
    group: 'Specialist',
    title: 'Enterprise Risk Management',
    subtitle: 'Specialist supervision §9.2 · Illustrative demo module',
    path: '/app/specialist/erm',
  },
  {
    id: 'spec-cybersecurity',
    group: 'Specialist',
    title: 'IT & Cybersecurity',
    subtitle: 'Specialist supervision §9.3 · Illustrative demo module',
    path: '/app/specialist/cybersecurity',
  },
  ...SPECIALIST_ASSESSMENTS.map((a): SearchResultItem => ({
    id: a.id,
    group: 'Specialist',
    title: `${a.reference} — ${a.title}`,
    subtitle: `${instName(a.institutionId)} · ${a.status} · Demo specialist assessment`,
    path: `${SPECIALIST_DOMAINS[a.domain]?.route ?? '/app/specialist'}?assessment=${encodeURIComponent(a.reference)}`,
  })),
]
