# Atheris Reg — Frontend Prototype

Banking Supervision & Regulatory Intelligence. Complete navigable frontend
prototype for central banks / supervisory authorities, built against:

- `docs/Atheris_Reg_Frontend_UI_Prototype_Specification.md` (behaviour & structure)
- `docs/thirdLine_Design_System.md` (exact visual values)

**Prototype status:** no backend exists. All data is fictional demo data
served through mock services; nothing here has regulatory effect, and no
real authentication or persistence of credentials occurs.

## Startup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build
npm run lint       # oxlint
npm test           # vitest run (jsdom + React Testing Library)
```

## Demo sign-in

- **Regulator:** `/login` — open "Demo identities" and click any user (e.g.
  `amara.osei@meridia-central.gov`), or type any valid-looking email.
  **Any password works** (e.g. `demo1234`). Routes to `/app/dashboard`.
- **Institution portal:** `/portal/login` — institution code `MCB-001`
  (Meridian Commercial Bank), `NMB-002` (Northstar Merchant Bank) or
  `CPB-004` (Crestline Payment Bank), any email/password. Routes to
  `/portal/dashboard`.
- Forgot/reset password flows at `/forgot-password` and `/reset-password`
  are simulated (demo token `DEMO-RESET`).
- The topbar user menu can **switch between all 17 Spec §19 demo roles** at
  any time — grouped into regulator roles and institution roles (the latter
  switch into the portal layout). Every demo surface carries the persistent
  "DEMO ROLE — NOT SECURE AUTHENTICATION" indicator. Switching roles changes
  the visible sidebar navigation per the role's mock permission profile
  (`src/config/roles.ts`).

Session state (demo user, jurisdiction, sidebar/nav-group state) persists
in `localStorage` under `atheris-reg-prototype-session`. Clear that key to
reset the demo session.

## What is built (Phase 1 + Phase 2 + Phase 3A + Phase 3B)

- **App shell** — navy sidebar with the full Spec §3.2 nav tree (role-aware,
  with live actionable queue counts), topbar with global search (⌘K),
  jurisdiction selector, notification bell, user menu; auth layouts;
  institution portal shell.
- **Supervisory Command Centre** (`/app/dashboard`) — five KPI cards that
  navigate to filtered lists, risk-distribution donut, portfolio-by-category
  bars, prudential trend lines (Recharts), plan execution progress,
  early-warning queue with detail drawer, high-priority findings, upcoming
  deadlines, activity timeline, watchlist, period selector, CSV export and
  refresh-demo-data actions.
- **My Work** (`/app/my-work`) — the eight work-item types in overdue /
  due-today / upcoming / completed sections with type, priority, due,
  status and institution filters; open, mark in-progress, complete,
  reassign and add-note actions (role-gated, prototype-session state).
- **Institution Registry** (`/app/institutions`) — searchable, filterable
  (category/status/risk/team/region), sortable DataTable; add/edit form
  (7 sections, React Hook Form + Zod: unique institution code, date
  ordering, unsaved-changes confirm); assign team; history drawer; mock
  import; CSV export.
- **Institution Profile** (`/app/institutions/:id` + `/financials`, `/risk`,
  `/examinations` sub-routes) — header with status badges, rating, lead
  supervisor and quick actions; 13 working tabs (overview KPIs, CAMELS-style
  dimensions, financial trend charts, ownership table + hierarchy visual,
  board register with fit-and-proper status, prudential indicators,
  examinations/returns/findings/remediation/enforcement read-only lists,
  documents with confidentiality labels, activity history).
- **Institution Groups / Branch Network / Directors & Key Officers** —
  registers with filters, group structure diagram, demo relationship
  management, branch detail drawer with examination history, fit-and-proper
  person register with appointment/status history.
- **Risk-Based Supervision** (`/app/risk-assessments`,
  `/app/risk-based-supervision`) — assessment register (methodology/version,
  inherent / control-effectiveness / residual), 8-step create wizard with
  evidence and supervisory judgement, detail with 5×5 risk heat map,
  category scores, prior-period comparison, approval trail and recommended
  supervisory intensity; portfolio intensity view.
- **Supervisory Plans** (`/app/supervisory-plans`) — annual/quarterly/
  event-driven register with list and calendar views, 7-step plan wizard,
  plan detail with timeline, coverage, execution controls and approval
  history.
- **Examinations** (`/app/examinations`) — register with table / calendar /
  kanban-by-stage views and seven filters; 6-step create wizard (basic
  info, scope, team, programme from approved library templates only,
  information request, review + submit); detail with 11 tabs; three-panel
  **Fieldwork Workspace** (procedure tree · test form with pass/fail/
  partial/N-A/not-tested results and unsaved-state protection · evidence,
  comments and review panel) with role-gated submit / return-for-rework /
  approve.
- **Examination Library** (`/app/examination-library`) — jurisdiction →
  category → domain → type → programme → procedure hierarchy browser,
  versioned templates with draft/review/approved/retired lifecycle and a
  template editor.
- **Evidence Repository** (`/app/evidence`) — register with confidentiality
  classification and review status, simulated upload with metadata, detail
  drawer with procedure/finding links, version and access history.
- **Findings & Remediation** (`/app/findings`, `/app/remediation`) —
  findings register, five-Cs finding form prefilled from procedure
  exceptions, detail with management response / corrective actions /
  approval trail; remediation register with milestones, evidence,
  extension requests and **regulator-gated closure** (institution roles
  can never close).
- **Regulatory Returns** (`/app/returns`, `/app/submission-monitoring`) —
  dashboard with six filter KPI cards and register / calendar / compliance /
  by-type / exception views (§11.1); template designer with definitions
  list, field-schema add/edit/reorder/remove, demo validation rules and
  draft→review→approved lifecycle (§11.2); submission detail with seven
  tabs, demo validation re-run, reconciliation and role-gated review
  decisions (§11.3). `return-validation` items feed My Work and the live
  nav counts.
- **Off-Site Surveillance** (`/app/surveillance`) — overview dashboard,
  exception table, watchlist, peer comparisons and per-institution
  surveillance detail with analyst reviews and decision history (§6.1).
- **Early Warning Alerts** (`/app/early-warnings`) — register with the §6.4
  columns plus alert detail (trigger explanation, source return deep-link,
  trend, rule version, related assessments, escalation history, linked
  action) and acknowledge / assign / escalate / dismiss / convert-to-
  examination workflow (§6.4). `?reference=EWA-…` deep links resolve to the
  alert detail.
- **Capital Adequacy** (`/app/prudential/capital`) — §8.1 KPI cards
  (regulatory capital, RWA, portfolio CAR, buffer/shortfall), capital
  composition donut, CET1/Tier 1/Tier 2 trend, RWA breakdown, deductions,
  capital stress summary, exception list, and submissions / breaches /
  adjustments tables. Submission detail modal carries formula, definition,
  source-submission deep link, period, rule version, calculation breakdown
  and reviewer status; start-review / accept / reject and breach status
  moves are role-gated. `?institution=` opens the per-institution capital
  detail (composition, trend, CAR calculation, breaches, stress summary).
- **Credit & Asset Quality** (`/app/prudential/credit`) — §8.2 KPI cards and
  the seven tabs (Portfolio Overview, Loan Classification, Impairment &
  Provisioning, Large Exposures, Related-Party Lending, Collateral, Credit
  Examination) with sector/classification/ageing/provision-movement charts,
  top borrowers, restructured loans and the loan sample review workspace
  (examiner conclusions gated by `record-fieldwork`). Story: Meridian's two
  large exposures under watch (EWA-2026-013), Vanguard related-party
  breaches from EXM-2026-012 → FND-2026-033.
- **Liquidity & Treasury** (`/app/prudential/liquidity`) — §8.3 KPI cards
  (HQLA, LCR, NSFR, deposit concentration, FX open position) and the seven
  tabs (Overview, Funding Profile, ALM, Treasury Operations, FX, Stress
  Testing, Exceptions) with liquidity trend, funding maturity ladder,
  liquid-asset composition, deposit-concentration and currency-exposure
  charts, the treasury examination workspace (gated examiner results) and
  the Northstar LCR story links (SUB-2026-0144 → EXC-2026-011 →
  EWA-2026-011 → EXM-2026-024).
- **Stress Testing** (`/app/prudential/stress-testing`) — §8.4 scenario
  library with assumptions, institution selection, demo run calculator,
  baseline-vs-stressed capital/liquidity/credit results, sensitivity grid
  and the submit → approve/reject reviewer workflow. Every calculation is
  labelled illustrative and never presented as an official regulatory
  stress-test result. `?run=RUN-…` deep-links a run.
- **Prudential Indicators** (`/app/prudential/indicators`) — §8.5
  configurable catalogue (nine demo indicators: code, definition, formula,
  unit, applicable types, thresholds, frequency, effective date, source
  return fields, validation rules) plus indicator detail with formula
  breakdown, portfolio history chart against threshold reference lines,
  threshold version history and story-anchored readings (e.g. Northstar
  LCR Q3 2026 = 104.2 → EWA-2026-011). Threshold edits are gated by
  `manage-indicator-thresholds` and bump the demo rule version.
  `?indicator=CODE` deep-links an indicator.
- **Coherent demo dataset** — eight fictional institutions (Meridian
  Commercial Bank, Northstar Merchant Bank, Unity Non-Interest Bank,
  Crestline Payment Bank, Aurora Savings & Loans, Delta Microfinance,
  Sentinel Custody & Trust, Vanguard Regional Bank) plus examinations,
  findings, returns, alerts, risk assessments, plans, corrective actions,
  enforcement cases and a work queue telling one story (Spec §17.5).
  Journey A (§22) runs end-to-end on linked anchors: EXM-2026-014 →
  FND-2026-101 → CAP-2026-003. **Journey B (§22) is complete end-to-end:**
  SUB-2026-0144 (Northstar MPR-04, LCR 104.2) → validation warnings →
  EXC-2026-011 → EWA-2026-011 → analyst assignment → EXM-2026-024, with
  step 4 (prudential indicators) served by the LCR detail reading anchored
  to the same story; EWA-2026-008 links enforcement case ENF-2026-002 and
  the Vanguard capital breach rows (SUB-2026-0143 rejected, November
  resubmission awaiting review).

## Stack

TypeScript (TSX) · Vite 8 · React 19 · react-router 8 (data router) ·
Tailwind CSS v4 (`@tailwindcss/vite`, tokens via `@theme inline`) ·
TanStack Table v8 (pinned 8.21.3) · **React Hook Form 7 + Zod 4 +
@hookform/resolvers 7** (forms, Phase 2A) · **Recharts 3** (charts,
Phase 2A) · Zustand · Lucide React icons · Fontsource variable fonts
(Inter, Roboto Mono — bundled locally, no CDN) · Vitest + React Testing
Library.

## Design tokens

Declared **once** in `src/styles/tokens.css` (CSS variables, `--tld-*`) and
mapped into Tailwind utilities in `src/styles/index.css` (`@theme inline`):
`bg-primary`, `text-ink-secondary`, `border-line`, `bg-tint-green`,
`shadow-card`, `text-heat-critical`, etc. Never hardcode hex values in
components — reference the tokens (chart palette: `src/components/charts/chartTheme.ts`).

## Structure (Spec §18.2)

```
src/
├── app/            router.tsx, handle.ts (route metadata)
├── components/
│   ├── brand/      BrandLogo
│   ├── charts/     chartTheme, RiskDonut, PortfolioCategoryBar, PrudentialTrendChart, RiskHeatMap
│   ├── ui/         Button, Card, StatCard, Badges, Modal, ConfirmDialog,
│   │               Drawer, Tabs, Progress, PageHeader, DropdownMenu, UserAvatar
│   ├── forms/      TextInput, TextArea, Select, Checkbox, Toggle
│   ├── data-display/ DataTable (sorting, pagination, selection, actions)
│   ├── navigation/ Breadcrumbs, GlobalSearchOverlay (⌘K), ModulePlaceholder
│   └── feedback/   ToastHost + toastStore, EmptyState/LoadingSkeleton/ErrorState
├── config/         navigation.ts (Spec §3.2 nav tree), roles.ts (§19 profiles)
├── features/       auth/, dashboard/, institutions/, work/, risk/, plans/,
│                   examinations/, library/, evidence/, findings/,
│                   remediation/, returns/, surveillance/, early-warnings/,
│                   prudential/ (capital, credit, liquidity, stress-testing,
│                   indicators), errors/
├── hooks/          useMediaQuery (responsive shell)
├── layouts/        RegulatorLayout, AuthLayout, InstitutionPortalLayout
├── mocks/          fixtures/ + repositories/ (never imported by components)
├── services/
│   ├── contracts/  AuthService, NotificationService, SearchService,
│   │               InstitutionService (+Branch/Director), DashboardService,
│   │               WorkQueueService, SupervisionReadService (+QueueCounts),
│   │               ExaminationService, FindingService, EvidenceService,
│   │               LibraryService, PlanService, RiskAssessmentService,
│   │               RemediationService, ReturnsService, SurveillanceService,
│   │               PrudentialService (CapitalAdequacy/CreditQuality/
│   │               LiquidityTreasury/StressTesting/IndicatorCatalogue)
│   └── mock/       Mock* implementations over the repositories
├── store/          sessionStore, notificationStore, uiStore, navCountStore
├── styles/         tokens.css, index.css
└── types/          auth.ts, common.ts, institution.ts, supervision.ts,
                    examination.ts, finding.ts, returns.ts, surveillance.ts,
                    prudential.ts (§8.1–§8.5 domain contracts)
```

**Rule (Spec §18.3):** components import service *interfaces* from
`src/services/contracts`; only mock services touch `src/mocks/repositories`.
A future `Api*Service` (Spring Boot) slots in without redesigning screens.

## Responsive behaviour (Spec §2.6)

- **≥1024px:** full 250px navy sidebar (user-toggleable to 72px rail).
- **768–1023px:** sidebar forced to 72px icon rail with hover tooltips.
- **<768px:** sidebar becomes an overlay drawer (topbar menu trigger,
  Escape/backdrop closes); grids stack; tables scroll horizontally.

## Known boundaries after Phase 3B

- All five prudential screens (Spec §8.1–§8.5) are live; **Journey B (§22)
  is demonstrable end-to-end**. Stress-test outputs are illustrative demo
  calculations and are labelled as never being official regulatory results.
- Global search and dashboard deep-links to Phase 4+ modules (specialist
  domains, enforcement detail and later) land on designed placeholders
  until their phase; capital-breach chips pointing at `ENF-…` land on the
  Enforcement placeholder (Phase 5).
- Indicator readings for NSFR/PC/DC/FXOP/LEV use seeded four-period demo
  histories; only CAR/LCR/NPL derive from the full eight-quarter snapshot
  series.
- Portal screens remain Phase 6 placeholders; portal roles only switch the
  layout and navigation visibility.
- The JS bundle exceeds 500 kB (Recharts weight); code-splitting is
  scheduled for the Phase 7 hardening pass.

See `PROGRESS.md` for the phase-by-phase build log.
