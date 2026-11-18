/**
 * Searchable demo entities (Spec §17.5 — derived from the one coherent
 * dataset so global search always matches the live records). Consumed only
 * by the mock search service.
 */
import { INSTITUTIONS } from '@/mocks/fixtures/institutions.fixture'
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
]
