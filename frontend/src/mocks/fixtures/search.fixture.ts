/**
 * Searchable demo entities (Spec §17.5 — one coherent fictional dataset;
 * the same institutions recur across modules). Consumed only by the mock
 * search repository.
 */
import type { SearchResultItem } from '@/services/contracts/SearchService'

export const SEARCH_RECORDS: SearchResultItem[] = [
  // Institutions
  {
    id: 'inst-meridian-commercial-bank',
    group: 'Institutions',
    title: 'Meridian Commercial Bank',
    subtitle: 'MCB-001 · Commercial bank · Fictional demo institution',
    path: '/app/institutions/inst-meridian-commercial-bank',
  },
  {
    id: 'inst-northstar-merchant-bank',
    group: 'Institutions',
    title: 'Northstar Merchant Bank',
    subtitle: 'NMB-002 · Merchant bank · Fictional demo institution',
    path: '/app/institutions/inst-northstar-merchant-bank',
  },
  {
    id: 'inst-unity-non-interest-bank',
    group: 'Institutions',
    title: 'Unity Non-Interest Bank',
    subtitle: 'UNIB-003 · Non-interest bank · Fictional demo institution',
    path: '/app/institutions/inst-unity-non-interest-bank',
  },
  {
    id: 'inst-crestline-payment-bank',
    group: 'Institutions',
    title: 'Crestline Payment Bank',
    subtitle: 'CPB-004 · Payment service bank · Fictional demo institution',
    path: '/app/institutions/inst-crestline-payment-bank',
  },
  // Examinations
  {
    id: 'exm-2026-014',
    group: 'Examinations',
    title: 'EXM-2026-014 — AML/CFT thematic examination',
    subtitle: 'Meridian Commercial Bank · Fieldwork in progress · Demo record',
    path: '/app/examinations/exm-2026-014',
  },
  {
    id: 'exm-2026-009',
    group: 'Examinations',
    title: 'EXM-2026-009 — Capital adequacy review',
    subtitle: 'Northstar Merchant Bank · Completed · Demo record',
    path: '/app/examinations/exm-2026-009',
  },
  {
    id: 'exm-2026-021',
    group: 'Examinations',
    title: 'EXM-2026-021 — Corporate governance examination',
    subtitle: 'Unity Non-Interest Bank · Planned · Demo record',
    path: '/app/examinations/exm-2026-021',
  },
  // Findings
  {
    id: 'fnd-2026-101',
    group: 'Findings',
    title: 'FND-2026-101 — AML transaction monitoring gaps',
    subtitle: 'Meridian Commercial Bank · High risk · Demo record',
    path: '/app/findings/fnd-2026-101',
  },
  {
    id: 'fnd-2026-087',
    group: 'Findings',
    title: 'FND-2026-087 — Liquidity reporting delays',
    subtitle: 'Northstar Merchant Bank · Medium risk · Demo record',
    path: '/app/findings/fnd-2026-087',
  },
  // Returns
  {
    id: 'sub-mpr09-meridian-2026-10',
    group: 'Returns',
    title: 'MPR-09 Capital adequacy return — October 2026',
    subtitle: 'Meridian Commercial Bank · Overdue · Demo record',
    path: '/app/returns/sub-mpr09-meridian-2026-10',
  },
  {
    id: 'sub-qsl03-crestline-2026-q3',
    group: 'Returns',
    title: 'QSL-03 Quarterly liquidity return — Q3 2026',
    subtitle: 'Crestline Payment Bank · Submitted · Demo record',
    path: '/app/returns/sub-qsl03-crestline-2026-q3',
  },
  // Directives
  {
    id: 'dir-2026-004',
    group: 'Directives',
    title: 'DIR-2026-004 — Corrective directive: AML remediation',
    subtitle: 'Meridian Commercial Bank · Open · Demo record',
    path: '/app/directives',
  },
  {
    id: 'dir-2026-002',
    group: 'Directives',
    title: 'DIR-2026-002 — Liquidity buffer directive',
    subtitle: 'Northstar Merchant Bank · Monitoring · Demo record',
    path: '/app/directives',
  },
  // Reports
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
