# Atheris Reg frontend prototype — build progress

Read this first at the start of every chunk; append an entry at the end of
every chunk (role contract in `banking/.qwen/agents/uiux-engineer.md`).

---

## Phase 1 — Design system and application shell (18 Nov 2026)

**Built (8 units, one commit each):**

1. **TS conversion + tooling** — tsconfig (TS 7, bundler resolution, `@/*`
   alias, `baseUrl` removed: TS7 dropped it), `vite.config.ts` (react +
   `@tailwindcss/vite` + vitest jsdom config), `main.tsx`/`App.tsx`, scripts
   `dev/build/lint/test`. Boilerplate assets/CSS deleted; brand favicon
   (gold-gradient shield). Installed: react-router 8, tailwindcss 4,
   lucide-react 1.x, zustand 5, @tanstack/react-table, vitest 5, RTL, jsdom,
   Fontsource variable Inter + Roboto Mono.
2. **Tokens & typography** — `src/styles/tokens.css` declares the full
   thirdLine token set once (`--tld-*`: primary/accent/semantics, tints,
   heat-map scale, gradients, shadows, layout dims); `index.css` maps them
   into Tailwind v4 via `@theme inline` (`bg-primary`, `text-ink-secondary`,
   `bg-tint-*`, `shadow-card`, `text-heat-*`, …), plus font stack, keyframes
   (pulse/bell-ring/slide-in/dropdown/modal/toast-progress), component helper
   classes (`.page-title`, `.kpi-value`, `.overline`, `.nav-section-label`,
   `.card-hover`, gradients) and reduced-motion support. Fonts are bundled
   locally via Fontsource (documented choice: no blocking external CDN).
3. **Types, store, mock auth** — `types/auth.ts` (DemoUser, DemoRole,
   Jurisdiction, PortalContext), `types/common.ts` (Paginated<T>, PageRequest,
   Notification per §16 categories); identity fixtures + `authRepository`;
   `AuthService` contract + `MockAuthService` (any demo password works;
   unknown emails fall back to the default demo supervisor; portal codes
   MCB-001/NMB-002); `sessionStore` (zustand persist → localStorage key
   `atheris-reg-prototype-session`; user, jurisdiction, sidebar, nav groups).
4. **AppShell** — `RegulatorLayout` (guard + shell + ⌘K binding), 250px navy
   `Sidebar` with the FULL §3.2 nav tree (10 sections, every item → real
   route; collapsible groups remembered in the session store; active item =
   3px gold left border; 72px icon rail with tooltips on tablet/collapsed;
   <768px overlay drawer), `Topbar` (toggle, title+breadcrumbs from route
   `handle`, search trigger, jurisdiction selector, help, notification bell
   with mock unread count + mark read/all-read panel, avatar + user dropdown
   with My Profile/Preferences/Security & Sessions/Switch Demo Role carrying
   the persistent "DEMO ROLE — NOT SECURE AUTHENTICATION" badge/Sign Out),
   `AuthLayout` (navy+gold split screen), `InstitutionPortalLayout` (light
   sidebar, §15 nav, portal branding + demo indicators).
5. **Shared UI kit** — Buttons (primary/outline/danger/success/warning/ai/
   ghost + loading), Card/CardHeader/CardBody, StatCard/KPICard, Status/
   Risk/Compliance badges + RiskTypeChip, TextInput/TextArea/Select/Checkbox/
   Toggle (labels, help, error states), Modal/ConfirmDialog/Drawer (portal,
   focus trap, Escape, focus restore, DS §9 transitions), DropdownMenu, Tabs
   (roving arrow keys), Toast stack (5s auto-dismiss + progress bar, z-110),
   EmptyState/LoadingSkeleton/ErrorState, ProgressBar/ProgressRing,
   PageHeader, Breadcrumbs, DataTable (TanStack v8: sorting, pagination,
   page-size selector, row selection + selection banner, column actions slot,
   loading/empty/error states).
6. **Auth screens** — `/login` (split/centered navy+gold card, brand logo
   36×36 gold-gradient + white shield glyph, BANKING SUPERVISION subtitle,
   show/hide password, remember checkbox, inline validation, loading/error
   states, prototype notice, click-to-fill demo identity list, SSO demo
   stub), `/portal/login` (institution code + email + password, separate
   branding/help/notice), `/forgot-password` + `/reset-password` (simulated
   flows, DEMO-RESET token, password rules meter).
7. **Router + placeholders** — every Spec §4 route registered plus
   sidebar-only routes (institution-groups, branch-network, directors,
   risk-based-supervision, examination-calendar, examination-programmes,
   fieldwork, prudential/indicators, regulatory/correspondence,
   submission-monitoring, directives, sanctions, corrective-action-plans,
   systemic-risk, admin/notification-settings, notifications, portal extras)
   — no dead ends. Shared `ModulePlaceholder` (navy/gold gradient header,
   "Module scheduled for Phase N" + phase scope + breadcrumb + back/Command
   Centre actions). `DashboardWelcome` at `/app/dashboard`. Designed 404.
   `GlobalSearchOverlay` (⌘K/Ctrl+K): grouped mock results
   (Institutions/Examinations/Findings/Returns/Directives/Reports) from
   `MockSearchService` over `search.fixture.ts` (the four §17.5 demo
   institutions, coherent cross-module references), recent searches,
   no-result state, clear action.
8. **Responsive pass + tests + docs** — sidebar behaviour covered by tests
   for desktop/tablet-rail/mobile-drawer (matchMedia-driven); README +
   PROGRESS written.

**Verified (real output):**

- `npm run build` → `tsc --noEmit` clean; vite build ✓ (426 kB JS / 129 kB
  gzip, 25 kB+ CSS).
- `npm run lint` → oxlint: **0 errors**, 4 warnings (all React-Compiler
  advisories: TanStack v8 `incompatible-library`, DropdownMenu render-prop
  `refs`, 2× `set-state-in-effect` in GlobalSearchOverlay debounce — none
  affect behaviour).
- `npm test` → **5 files, 15 tests, all passing**: sign-in flow (mock auth →
  dashboard redirect + session store assertions), validation + prototype
  labelling, sidebar active-item/group-collapse/icon-rail/mobile-drawer,
  DataTable sort (desc-first per TanStack default) + pagination + page size +
  row selection + empty state, Modal focus-in/Escape/focus-restore/Tab-trap.
- Dev-server smoke: `vite` serves `/`, `main.tsx`, styles (HTTP 200).

**Decisions / deviations:**

- npm resolved current majors: react-router **8** (brief said v7; v8 keeps
  the same data-router API), TanStack Table **v8 pinned** (v9 rewrote the
  API — `useReactTable` removed — so v8.21.3 is pinned for stability),
  TypeScript 7, Vitest 5, Tailwind 4.3.
- Lucide 1.x renamed icons (no AlertTriangle/HelpCircle/History aliases):
  canonical names used (TriangleExclamationPoint, CircleQuestionMark,
  RotateCcw, …).
- `DemoRole` ids/labels are provisional — Spec §19 was out of this chunk's
  reading budget; **Phase 2 must reconcile the role matrix** (and any
  role-gated nav) with §19.
- Notification/search mock state is in-memory per page load; sidebar+session
  state persists in localStorage (clearly namespaced key). No credentials
  stored anywhere.
- React Hook Form + Zod and Recharts deliberately not installed yet
  (Spec §18.1: add in the phase that first needs them).

**Next chunk owes (Phase 2 — Core supervisory journey, Spec §21):**

- Command Centre (`/app/dashboard` replaces `DashboardWelcome`), My Work,
  Institution Registry/Profile (+financials/risk/examinations sub-routes),
  Institution Groups, Branch Network, Directors, Risk Assessments,
  Risk-Based Supervision, Supervisory Plans, Examination Register/Create
  wizard/Detail/Workspace (+calendar/programmes/fieldwork routes),
  Examination Library, Evidence, Findings (+detail), Remediation.
- Introduce React Hook Form + Zod and Recharts here; add the §17.5 coherent
  dataset (institutions/examinations/findings/returns/alerts telling one
  story) as fixtures + repositories + contracts per §18.3; reconcile
  DemoRole with §19; wire sidebar queue counts to live mock data.
- Journey A must be demonstrable end-to-end at the end of Phase 2.

---

## Phase 2A — Data foundation, Command Centre, My Work, Institution Management (18 Nov 2026)

First half of Spec §21 Phase 2. A separate 2B chunk owns risk assessments,
supervisory plans, examinations (register/wizard/detail/workspace),
examination library, evidence, findings and remediation (completing Journey A).

**Built (10 units, one commit each):**

1. **Libraries** — react-hook-form 7.92, zod 4.6, @hookform/resolvers 7.0,
   recharts 3.11 (all React-19-compatible; pins recorded here per brief).
2. **Coherent demo dataset (Spec §17.5/§18.3/§18.4)** — the ONE story-world:
   8 fictional institutions (Meridian Commercial Bank MCB-001, Northstar
   Merchant Bank NMB-002, Unity Non-Interest Bank UNIB-003, Crestline
   Payment Bank CPB-004, Aurora Savings & Loans ASL-005, Delta
   Microfinance DMB-006, Sentinel Custody & Trust SCT-007, Vanguard
   Regional Bank VRB-008 — suspended/critical, in restructuring), 5 groups,
   72 branches, ~57 directors, shareholders, documents, CAMELS-style
   dimensions, 8 quarters of financials per institution, examinations
   (incl. EXM-2026-014/009/021 from Phase-1 search), findings (open counts
   match each Institution.openFindingsCount), returns, alerts, risk
   assessments, plans, corrective actions, enforcement, watchlist, work
   queue, activity timeline. UUID-shaped ids (`demoUuid` deterministic
   helper), ISO dates (due/overdue generated relative to today so buckets
   stay live), money as decimal strings. Types in `types/institution.ts` +
   `types/supervision.ts`; repositories in `mocks/repositories`; contracts
   `InstitutionService` (+Branch/Director), `DashboardService`,
   `WorkQueueService`, `SupervisionReadService` (+`QueueCountsService`);
   `NotificationService` extended with `push` + `resetDemoData`. Components
   never import fixtures. Phase-1 fixtures reconciled: portal + search
   records now reference the new UUIDs; data already contains every entity
   2B needs. 2B story hooks: Meridian AML exam + overdue CAP-2026-003,
   Northstar amber liquidity → targeted EXM-2026-024, Unity governance exam
   planned, Crestline assessment in progress, Vanguard restructuring +
   ENF-2026-002.
3. **DemoRole reconciliation (§19)** — all 17 roles with ids/labels in
   `types/auth.ts`, one demo identity each in `identity.fixture.ts`
   (incl. 3 portal roles; CPB-004 added to portal sign-in), mock permission
   profiles in `config/roles.ts` (visibleNavSections, visiblePortalNav,
   allowedActions, scope, canApprove/canExport, restrictedAreas). Sidebar
   and portal nav filter per role; role switcher lists all 17 grouped
   regulator/institution, keeps the persistent "DEMO ROLE — NOT SECURE
   AUTHENTICATION" indicator, and institution roles land in the portal
   layout.
4. **Supervisory Command Centre (§5.2)** — replaced `DashboardWelcome`
   (deleted) at /app/dashboard: header with jurisdiction + reporting date +
   period selector (quarter/YTD/trailing-12m changes window & deltas) +
   Export (prototype CSV via `utils/exportCsv`) + Refresh demo data. 5 KPI
   cards navigate to filtered lists (e.g. /app/institutions?risk=Critical,High).
   Recharts donut (risk distribution, clickable segments + keyboard-accessible
   legend), portfolio-by-category bars (clickable), prudential trend lines
   (asset-weighted from snapshots), plan execution progress, alert queue with
   detail drawer + demo acknowledge, high-priority findings, upcoming
   exams/deadlines, activity timeline, watchlist — all from
   `MockDashboardService`; everything labelled illustrative/demo.
5. **My Work (§5.3)** — all eight item types, overdue/due-today/upcoming/
   recently-completed sections, filters (search, type, priority, due,
   status, institution), open/mark in-progress/complete/reassign/add-note
   via `WorkQueueService` local state, actions gated by role permissions
   (`manage-work-queue`, `reassign-work`).
6. **Institution Registry (§5.4)** — DataTable (10 columns), search +
   category/status/risk/team/region filters synced to the URL (so Command
   Centre KPI links filter correctly), Add institution, mock import
   (simulated, honest), CSV export, row menu (view/edit/assign
   team/history). Create/edit form: 7 sections, RHF + Zod (required
   identity fields, code format, date ordering via superRefine, licence
   category required), async unique-code check on submit, unsaved-changes
   ConfirmDialog.
7. **Institution Profile (§5.5)** — /app/institutions/:institutionId plus
   /financials, /risk, /examinations sub-routes (same workspace, tab from
   URL segment; other tabs via ?tab=). Header: badges (licence/portfolio/
   status), risk rating, lead supervisor, quick actions (request
   information, create examination → /app/examinations/new?institutionId=,
   add note → activity feed, export profile CSV). 13 tabs: Overview (KPIs,
   risk summary, dimensions, trend chart, findings/returns/exams/alerts/
   actions), Corporate Profile, Ownership & Group (shareholders table +
   hierarchy visual + consolidated supervision), Board & Management
   (fit-and-proper register), Financial Performance (trend chart + quarterly
   table with demo threshold highlighting), Prudential Indicators (latest
   snapshot vs demo thresholds), Risk Profile (CAMELS cards + assessments
   with dimension scores), Examinations (read-only list, Phase 2B note),
   Regulatory Returns (read-only table), Findings & Remediation (findings +
   CAP progress), Enforcement, Documents (confidentiality labels),
   Activity History. Unknown id → designed error state, no dead end.
8. **Groups / Branch Network / Directors (§5.6)** — group register cards
   with exposure/risk summary, structure diagram drawer, demo
   add-relationship (session-only, labelled); branch register (DataTable,
   institution/region/status filters + search) with detail drawer incl.
   examination history; directors register (filters incl. fit-and-proper
   status) with profile drawer carrying appointment/status history and
   conflict declarations.
9. **Sidebar live counts** — static numbers removed from
   `config/navigation.ts`; `navCountStore` + `QueueCountsService` feed
   My Work / Early Warnings / Findings / Regulatory Returns (overdue) /
   Enforcement counts from the same repositories the screens read.
10. **Tests + docs** — new Vitest+RTL suites: Command Centre KPI navigation
    (3 nav assertions + demo labelling), registry URL risk filter + category
    select filter + open-findings sorting (desc-first per TanStack),
    institution form validation (schema date-ordering unit tests + modal
    unique-code reject/accept + date-order block), role-based sidebar
    visibility (director/examiner/read-only + persistent demo indicator).
    Test setup gained ResizeObserver + createObjectURL stubs (Recharts/CSV
    in jsdom). README rewritten for Phase 2A.

**Verified (real output):**

- `npm run build` → tsc clean; vite build ✓ (1.29 MB JS / 367 kB gzip —
  Recharts added ~870 kB raw; chunk-size warning noted, code-splitting is a
  Phase 7 hardening candidate).
- `npm run lint` → oxlint: **0 errors, 12 warnings** — all React-Compiler
  advisories: 9× `set-state-in-effect` (the standard async data-load pattern
  `useEffect(() => { void load() }, [load])` in the new pages), 2×
  `incompatible-library` (TanStack Table v8, pre-existing Phase 1), 1×
  `refs` (DropdownMenu render-prop, pre-existing Phase 1). None affect
  behaviour; documented per brief.
- `npm test` → **9 files, 33 tests, all passing** (15 Phase-1 + 18 new).

**Decisions / deviations:**

- `z.coerce.number()` broke zodResolver input/output typing under TS7 —
  numeric form fields kept as validated strings and converted on submit.
- Institution ids migrated from Phase-1 slugs (`inst-meridian-…`) to
  UUID-shaped ids per Spec §18.4; `search.fixture` and portal identities
  updated in the same commit (global search + portal login verified by the
  existing Phase-1 tests).
- `listFor(assigneeId)` in the work-queue repository falls back to the whole
  unfinished queue when a switched demo role owns no items, so My Work is
  never empty during role demos (documented demo behaviour).
- Notification fixture ref EXF-2026-014 corrected to FND-2026-118 so the
  bell panel matches the findings dataset.
- No new libraries beyond the brief's list (react-hook-form, zod,
  @hookform/resolvers, recharts).

**Next chunk owes (Phase 2B — completes Journey A, Spec §21/§22):**

- Risk Assessments (/app/risk-assessments + risk-based-supervision),
  Supervisory Plans, Examination Register / Create wizard / Detail /
  Fieldwork Workspace (+calendar/programmes/fieldwork routes), Examination
  Library, Evidence Repository, Findings (+detail), Follow-Up & Remediation.
- Dataset is ready: extend `SupervisionReadService` family with workflow
  mutations over the SAME fixtures (EXM-2026-014 fieldwork, FND-2026-101 →
  CAP-2026-003, EXM-2026-021 planned, EXM-2026-024 targeted-from-alert).
  Journey A step 1 (register a bank) already works via the Registry form;
  steps 3–10 are 2B.
- Profile tabs currently deep-link to placeholder examination/finding/
  remediation routes — 2B replaces those elements, nothing else changes.

## Phase 2B — Core supervisory journey (18–19 Nov 2026)

Units 1–9 were built and committed (`b6be13a`…`e4d4517`) by the chunk
agent, which then died on a model-request timeout during unit 10. All
commits and the four new test files survived; the lead completed unit 10
(test-fix, docs, gate) directly.

**Built:**
- Domain extension — examination/finding/remediation/assessment/plan
  workflow types, fixtures (incl. `storyRefs.ts` anchors), repositories
  and role-gated workflow-mutation contracts (`b6be13a`).
- Risk-Based Supervision — register, 8-step wizard, detail with 5×5 heat
  map, portfolio intensity view (`4725874`).
- Supervisory Plans — list/calendar register, 7-step wizard, plan detail
  with timeline and execution controls (`159b8c1`).
- Examination Register (table/calendar/kanban) + 6-step create wizard
  (`91a9dec`); Examination Detail (11 tabs) + three-panel Fieldwork
  Workspace (`947c841`).
- Examination Library — hierarchy browser, versioned templates, editor
  (`af2eb7e`). Evidence Repository — register, simulated upload, detail
  drawer (`428b238`). Findings five-Cs + Remediation with
  regulator-gated closure (`e742783`).
- Cross-wiring — alert→targeted-examination conversion, live queue
  counts, My Work deep-links (`e4d4517`). Journey A (§22) is
  demonstrable end-to-end on EXM-2026-014 → FND-2026-101 → CAP-2026-003.

**Bug found during lead verification and fixed (`Modal.tsx`):** the
focus/keydown effect depended on `[open, onClose]` and callers pass inline
`onClose` arrows, so every parent re-render (each keystroke of a
*controlled* form inside a modal) re-ran the effect and moved focus to the
first focusable element — the X close button. Typing a space then
activated it and silently closed the dialog (this broke the raise-finding
flow). Fixed by holding `onClose` in a ref and running the effect only on
`[open]`. RHF-based forms never hit this because registered inputs are
uncontrolled. Regression-covered by `ExaminationWorkspacePage.test.tsx`.

**Verification (lead-run, 19 Nov 2026):**
- `npm run build` → tsc clean, ✓ built (chunk >500 kB advisory unchanged —
  Recharts; code-splitting deferred to Phase 7).
- `npm run lint` → 0 errors, 39 warnings (React-Compiler advisories:
  `set-state-in-effect` on the new pages' async-load pattern + the 3
  pre-existing Phase-1 ones).
- `npm test` → **13 files, 50 tests, all passing** (33 prior + 17 new:
  risk-assessment wizard, examination workflow mutations incl.
  raise-from-procedure linking, role-gating matrix, workspace fieldwork
  flow).

**Next chunk owes (Phase 3 — surveillance, returns, prudential; Spec §21):**
- Off-Site Surveillance (§6.1), Early Warning Alert detail flows (§6.4),
  Regulatory Returns dashboard/submission detail/template designer
  (§11.1–11.3), Capital / Credit / Liquidity / Stress Testing (§8.1–8.4),
  Prudential Indicators (§8.5). Acceptance: Journey B (§22).
- Dataset already carries returns/alerts/prudential references; extend
  fixtures+repositories+contracts the same way (components never import
  fixtures). Swap the remaining Phase-3 `moduleRoute(...)` elements in
  `src/app/router.tsx`; Command Centre alert drawer and profile tabs
  already deep-link into these routes.

## Phase 3A — Returns, off-site surveillance, early warnings (19–20 Nov 2026)

Built on the pre-committed 3A type layer (`41a8b9e`). Units 1–7 were
committed by the chunk agent (`c27a11f`…`7de1311`), which then died on a
provider content-filter false positive (`data_inspection_failed`) during
unit 8 — the third infra death on this chunk's surveillance/AML text. It
left four test files untracked plus one uncommitted repository fix; the
lead finished unit 8 (test-query fixes, docs, gate) directly.

**Built:**
- Data layer — returns/surveillance/alert fixtures, repositories,
  `ReturnsService` + `SurveillanceService` contracts and role-gated mock
  services; `storyRefs.ts` extended with return + alert anchors
  (SUB-2026-0144 → EWA-2026-011 → EXM-2026-024; EWA-2026-008 ↔
  ENF-2026-002); `return-validation` wired into workQueueRepository +
  navCountStore (`c27a11f`).
- Returns dashboard (§11.1) — six filter KPI cards, register/calendar/
  compliance/type/exception views (`894ce12`).
- Return template designer (§11.2) — definitions view, field-schema
  add/edit/reorder/remove, demo validation rules, approval lifecycle
  (`dabf2d6`).
- Return submission detail (§11.3) — seven tabs, demo validation re-run,
  reconciliation, role-gated review decisions (`6f3b8cd`).
- Off-site surveillance (§6.1) — overview dashboard, exception table,
  watchlist, peer comparisons, institution surveillance detail with
  analyst reviews + decision history (`434c48f`).
- Early warning alerts (§6.4) — register with §6.4 columns, alert detail
  (trigger, source return, trend, rule version, assessments, escalation
  history, linked action), acknowledge/assign/escalate/dismiss/convert
  workflow (`dcb2498`).
- Cross-wiring — router swaps for surveillance, early-warnings, returns,
  submission detail and submission-monitoring; profile alerts deep-link to
  alert detail (`7de1311`).
- Unit 8 (lead) — 4 test files (returns dashboard/detail flows, early-
  warnings flows, returns + early-warning workflow mutation and gating
  tests); fixed 6 ambiguous test queries (text rendered in both detail
  header and body → `getAllByText`/`findAllByText`; gating test re-render
  needed explicit `unmount()` — RTL cleanup only runs between tests);
  committed the agent's salvaged `returnsRepository` field-order fix
  (append after max order, not `fields.length`, so reordered schemas keep
  unique orders).

**Verification (lead-run, 20 Nov 2026):**
- `npm run build` → tsc clean, ✓ built (>500 kB Recharts advisory
  unchanged, deferred to Phase 7).
- `npm run lint` → 0 errors, 46 warnings (React-Compiler advisories: +7
  `set-state-in-effect` on the new pages' async-load pattern, same class
  as documented in 2A/2B).
- `npm test` → **17 files, 82 tests, all passing** (50 prior + 32 new).

**Next chunk owes (Phase 3B — prudential, completes Journey B step 4):**
- Capital (§8.1), Credit (§8.2), Liquidity (§8.3), Stress Testing (§8.4),
  Prudential Indicators (§8.5) — swap the remaining Phase-3
  `moduleRoute(...)` placeholders.
- The dataset already carries prudential references (SUB-2026-0143
  Vanguard capital return, trend charts on profile/dashboard); extend
  fixtures+repositories+contracts the same way, keep the one-story rule.
- After 3B: Phase 4 specialist domains per Spec §21.

---

## Phase 3B — Prudential supervision (19 Nov 2026)

Built on the pre-committed 3B type layer (`a28f449`,
`src/types/prudential.ts` — §8.1–§8.5 contracts). Completes Journey B
step 4; all five remaining Phase-3 `moduleRoute(...)` placeholders are
swapped. Nine units, one commit each (`e8b063d`…docs).

**Built:**
- **Data layer** (`e8b063d`) — `prudential.fixture.ts` (capital
  submissions/breaches/adjustments, credit loan-book seeds + sector mix +
  top borrowers + large exposures + related-party + restructured +
  collateral + loan samples, liquidity seeds + funding maturity + liquid
  assets + currency exposure + treasury transactions, stress scenarios +
  seeded runs + severity factors + sensitivity seed, nine-indicator
  catalogue + threshold history + latest seeds), `prudentialRepository`
  (mutable session state + reset, snapshot-derived readings, stress run
  calculator), `PrudentialService` contracts (CapitalAdequacy / CreditQuality
  / LiquidityTreasury / StressTesting / IndicatorCatalogue) and
  role-gated `MockPrudentialService`. Four new `DemoAction`s
  (`review-prudential`, `approve-prudential`, `run-stress-test`,
  `manage-indicator-thresholds`) wired through `config/roles.ts` tiers;
  registered in `demoDataReset`; `storyRefs.ts` gained prudential anchors.
  One story: SUB-2026-0143 (Vanguard capital, rejected, + a November
  resubmission awaiting review) ↔ EWA-2026-008 ↔ ENF-2026-002;
  SUB-2026-0144 (Northstar MPR-04, LCR 104.2) → EXC-2026-011 →
  EWA-2026-011 → EXM-2026-024; SUB-2026-0145 (Meridian QAR-02, NPL 6.9) →
  EWA-2026-013; Delta PC 92 → EXC-2026-018.
- **Capital Adequacy** (`7a9668e`, §8.1) — KPI cards, composition donut,
  CET1/Tier1/Tier2/CAR trend, RWA breakdown, deductions, stress summary,
  exception list, submissions/breaches/adjustments tables; submission
  detail modal (formula, definition, source-submission deep link, period,
  rule version, calculation breakdown, reviewer status); start-review /
  accept / reject and breach-status workflows role-gated; `?institution=`
  per-institution capital detail.
- **Credit & Asset Quality** (`63df4bb`, §8.2) — KPI cards + seven tabs
  (Portfolio Overview, Loan Classification, Impairment & Provisioning,
  Large Exposures, Related-Party Lending, Collateral, Credit Examination)
  with sector/classification/ageing/provision charts and the loan sample
  review drawer (gated `record-fieldwork` conclusions); evidence chips
  deep-link via the new `?search=` on the Evidence Repository.
- **Liquidity & Treasury** (`a195a61`, §8.3) — KPI cards + seven tabs
  (Overview, Funding Profile, ALM, Treasury Operations, FX, Stress
  Testing, Exceptions) with liquidity trend, maturity ladder, liquid-asset
  composition, deposit-concentration and currency charts, the treasury
  examination workspace (gated examiner results) and the Northstar LCR
  story links.
- **Stress Testing** (`23075e5`, §8.4) — scenario library with assumptions
  modal, run register, institution selection + demo run calculator,
  baseline-vs-stressed results, sensitivity grid, submit→approve/reject
  reviewer workflow; every result labelled illustrative (never official).
  `?run=RUN-…` deep-links a run.
- **Prudential Indicators** (`bc64a52`, §8.5) — configurable catalogue
  (nine indicators) + detail with formula breakdown, portfolio history
  chart against threshold reference lines, threshold version history and
  story-anchored readings; threshold editor gated by
  `manage-indicator-thresholds` and versions the demo rule.
  `?indicator=CODE` deep-links an indicator.
- **Cross-wiring** (`cfc16bc`) — Command Centre prudential-trend card and
  Institution-profile prudential tab now deep-link into all five screens;
  alert-detail links to the matching indicator; global search gained a
  Prudential group (five screens + CAR/LCR/NPL story indicators); early
  warnings resolve `?reference=EWA-…`; returns resolve `?search=`.
- **Tests + docs** (`808ed46`, `a993f1d`, docs) —
  `prudentialWorkflow.test.ts` (15 service-level tests: capital review/
  decision tiers, loan-sample + treasury conclusions, stress lifecycle and
  calculator, indicator thresholds + story readings) and five page-flow
  suites (capital, credit, liquidity, stress, indicators) covering KPI
  rendering, story anchors, tab navigation, workflow mutations and §19
  role gating (analyst vs lead vs examiner vs read-only).

**Bug found and fixed (`Drawer.tsx`, `808ed46`):** the same latent defect
the lead fixed in `Modal.tsx` during 2B — the focus/keydown effect
depended on `[open, onClose]` and callers pass inline `onClose` arrows, so
every re-render of a *controlled* form inside a drawer re-ran the effect
and moved focus to the first focusable (the X close button); the next
typed space activated it and silently closed the drawer. This broke the
loan-sample and treasury conclusion flows. Fixed by holding `onClose` in a
ref and running the effect only on `[open]`. Regression-covered by
`CreditAssetQualityPage.test.tsx`.

**Verified (real output, 19 Nov 2026):**
- `npm run build` → tsc clean; ✓ built (>500 kB Recharts advisory
  unchanged, deferred to Phase 7).
- `npm run lint` → oxlint: **0 errors, 53 warnings** — all React-Compiler
  advisories: the pre-existing 3 (2× TanStack `incompatible-library`,
  1× DropdownMenu `refs`) plus `set-state-in-effect` on the new pages'
  standard async-load pattern (same class documented since 2A/2B/3A).
- `npm test` → **23 files, 119 tests, all passing** (82 prior + 37 new).

**Decisions / deviations:**
- No new libraries — Recharts, TanStack Table, RHF/Zod already present.
- Indicator readings for NSFR/PC/DC/FXOP/LEV use seeded four-period demo
  histories (`SEED_HISTORY_OVERRIDES` where the story needs exact values);
  CAR/LCR/NPL derive from the full eight-quarter snapshot series.
- Northstar's Q3 2026 snapshot `liquidityRatioPct` is exactly 104.2, so
  the LCR reading and the EWA-2026-011 / EXC-2026-011 anchors reconcile
  with the 3A surveillance data without duplication.
- Institution roles are refused every prudential mutation
  (`assertRegulator`), matching the §7.8 hard rule.

**Next chunk owes (Phase 4 — specialist domains, Spec §21/§9):**
- Six specialist supervision domains (governance, ERM, cyber, AML,
  operations, consumer protection) using the consistent §9 page pattern
  (dashboard · assessment register · assessment/exam detail · checklist &
  procedures · evidence · findings · report · history), plus Frameworks,
  Obligations and Correspondence. Swap the `specialist/*` and
  `regulatory/frameworks|obligations|correspondence` `moduleRoute(...)`
  placeholders.
- Extend fixtures+repositories+contracts the same way (components never
  import fixtures); the Meridian AML story (EXM-2026-014 → FND-2026-101 →
  CAP-2026-003) and the Crestline cyber exam (EXM-2026-005) are ready
  anchors for the AML and cybersecurity domains.
- Consider the Phase-7 code-splitting pass if the bundle keeps growing.

---

## Phase 4A — Regulatory administration (19 Nov 2026)

First chunk of Spec §21 Phase 4: §10.1 Regulatory Frameworks, §10.2
Regulatory Obligations, §10.3 Regulatory Correspondence plus their data
layer. The six §9 specialist domains are chunks 4B/4C and remain designed
placeholders. Six units, one commit each (`a0cdcd3`…docs); a host restart
mid-chunk cost nothing (commit-per-unit recovery worked as designed).

**Built:**
- **Data layer** (`a0cdcd3`) — `types/regulatory.ts` (frameworks,
  requirements with `SupervisoryDomain` keys for §9 reuse, obligations with
  per-institution compliance, correspondence with the full status machine;
  `FrameworkMapping` doubles as the cross-module relation type),
  `regulatory.fixture.ts` (8 fictional MBA frameworks whose citations match
  the examination library's `regulatoryMapping` refs — MBA/PRU/2024 (+2021
  superseded), MBA/AML/2023, MBA/GOV/2024, MBA/CYB/2025, MBA/CPC/2025,
  MBA/NIB/2023, MBA/PSB/2026 consultation draft shipping labelled
  "Demo AI response" extracted requirements; ~25 requirements; 12
  obligations discharging through MPR-09/MPR-04/QAR-02 with per-institution
  statuses anchored to the live story — Vanguard Non-Compliant ↔
  SUB-2026-0143/EWA-2026-008/ENF-2026-002, Meridian STR Non-Compliant ↔
  FND-2026-101/CAP-2026-003, Northstar Partial ↔ SUB-2026-0144/
  EWA-2026-011/EXM-2026-024; 10 correspondence threads incl. the
  DIR-2026-002 acknowledgement matching the Northstar profile document),
  `regulatoryRepository` (mutable session state, simulated upload +
  `simulateAiExtraction`, workflow transitions with thread events, reset),
  `RegulatoryService` contracts (Framework/Obligation/Correspondence) and
  role-gated `MockRegulatoryService` (assertRegulator + 4 new DemoActions:
  `manage-frameworks`, `manage-obligations`, `manage-correspondence`,
  `approve-correspondence` — ALL/APPROVAL tiers + legal officer
  compose/manage but never approve; examiners/principal get
  `manage-correspondence` only). Registered in `demoDataReset`;
  `storyRefs.ts` gained framework/obligation/correspondence maps,
  `REQUIREMENT_ID_BY_CITATION` and `REGULATORY_STORY` anchors.
- **Regulatory Frameworks** (`a0e4f9f`, §10.1) — library register
  (citation, category, jurisdiction, authority, version, dates, status,
  AI-draft pill) + detail with the six spec tabs (Overview · Requirements ·
  Applicability · Mappings · Documents · Version history). Requirement
  drawer carries every §10.1 field incl. evidence expected, mapped library
  procedures, related obligations and story-anchor chips; AI drafts get a
  purple "Demo AI response" banner + gated approve/reject with review note;
  simulated upload modal with AI-extraction toggle; version publishing
  appends demo history. `?framework=CODE&requirement=ID` deep-links.
- **Regulatory Obligations** (`3803c11`, §10.2) — register with all spec
  columns (worst-case compliance rollup, overdue-review badges, framework
  and return-code chips) + detail (source requirement deep links into the
  framework drawer, per-institution compliance with anchors — CAP links,
  DIR/ENF Phase-5 chips, gated applicability editor (add/remove +
  mandatory reason → change history), status verification, review
  recording (defaults +90d), full change history. `?obligation=REF`.
- **Regulatory Correspondence** (`81541d0`, §10.3) — register (type,
  direction, dates, subject, related chips, parties, status, attachments) +
  letter-preview detail (fictional MBA letterhead, sender/recipient blocks,
  authorised-by, attachments with confidentiality + simulated download,
  related records, thread history) and the full compose → review → approve
  → send-demo workflow: compose modal with institution-scoped
  related-record picker and simulated attachments; submit for review
  (pushes an `approval-required` notification); request changes; approve
  (records authoriser); confirm-guarded **simulated** send — every surface
  states no real communication is sent (§10.3); incoming threads support
  log-response & close. `?correspondence=REF`, `?institution=ID`.
- **Cross-wiring** (`8360da9`) — global search gained a Regulatory group
  (3 screens + 8 frameworks + 12 obligations + 10 threads, `Library` icon);
  Command Centre upcoming-deadlines now includes obligation reviews
  (overdue/≤7d → new `obligation-review` UpcomingItem kind linking
  `?obligation=`); institution-profile Documents tab deep-links to the
  correspondence register filtered to that institution.
- **Tests + docs** (`c5874e9`, docs) — `regulatoryWorkflow.test.ts`
  (18 service-level tests: upload/AI-extraction distinction, requirement
  decisions, versioning, applicability/review/status mutations, full
  correspondence lifecycle incl. invalid-transition returns and
  notification push, §19 gating matrix incl. institution-role refusal) and
  three page-flow suites (6+6+7: library/tabs/drawer/AI-approval/upload
  flow, register/anchors/Phase-5-chip/gating/review flow, register/letter
  preview/send-demo honesty/gating/compose flow) — using
  `getAllByText` for header+body duplicates and explicit `unmount()`
  between double renders (3A lessons applied).

**Bug found and fixed while testing (`RegulatoryCorrespondencePage.tsx`,
`c5874e9`):** the workflow helper toasted success *before* `finally`
released the `busy` state, so the next workflow button was still disabled
in the render where the confirmation appeared (tests clicked a disabled
button; users would see the same dead moment). `run()` now releases `busy`
before toasting. Test-side hardening: `findByRole` + `waitFor(enabled)`
before workflow clicks.

**Verified (real output, 19 Nov 2026):**
- `npm run build` → tsc clean; ✓ built (>500 kB Recharts advisory
  unchanged, deferred to Phase 7).
- `npm run lint` → oxlint: **0 errors, 66 warnings** — baseline 53 + 13 new
  `set-state-in-effect` React-Compiler advisories on the new pages'
  standard async-load pattern (same documented class as 2A/2B/3A/3B).
- `npm test` → **27 files, 156 tests, all passing** (119 prior + 37 new).

**Decisions / deviations:**
- No new libraries. `FrameworkMappingKind` gained `return-submission`,
  `alert` and `corrective-action` so relation chips are typed honestly
  instead of reusing `finding` for non-findings.
- One `RegulatoryService.ts` contract file with three interfaces — matches
  the `PrudentialService.ts` granularity precedent.
- DIR-/ENF- refs resolve to non-interactive labelled chips (`Lock` icon,
  Phase-5 note) — referenceable, never broken links, per the brief.
- Procedure-mapping chips navigate to the plain Examination Library (the
  library page has no `?search=` param yet — a cheap 4B/7 enhancement).
- Correspondence detail loads the institution via `institutionService`
  rather than importing fixtures (components never import fixtures).

**Next chunk owes (Phase 4B/4C — specialist domains, Spec §21/§9):**
- **4B recommendation:** build the shared §9 specialist page pattern once
  (dashboard · assessment register · assessment/exam detail · checklist &
  procedures · evidence · findings · report · history) and instantiate
  Governance (§9.1), ERM (§9.2) and Cybersecurity (§9.3); **4C:** AML
  (§9.4), Operations (§9.5), Consumer Protection (§9.6). Swap the
  `specialist/*` `moduleRoute(...)` placeholders only.
- The §10 layer is built for this: filter requirements by
  `SupervisoryDomain` ('governance'/'erm'/'cybersecurity'/'aml'/
  'operations'/'consumer-protection') to drive each domain's obligation and
  evidence checklists; `mappedProcedureRefs` match library citations
  (MBA/GOV/2024 §2.1, MBA/CYB/2025 §3.1/§5.2, MBA/AML/2023 §4.1/§6.3,
  MBA/NIB/2023 §4.4, MBA/OPS/2026 §2.1); ready anchors: Governance ←
  FND-2026-109/037/118 + EXM-2026-021; Cyber ← EXM-2026-005 +
  FND-2026-066/062 + CAP-2026-008; AML ← EXM-2026-014 + FND-2026-101/107 +
  CAP-2026-003 + DIR-2026-004 (chip). The Phase-4 acceptance (specialist
  examination mapped to regulatory requirements) closes by rendering each
  domain's assessments against those requirement records.
- Reuse `RelationChip` for cross-module refs and the 4A gating pattern
  (new `DemoAction`s per domain if needed); extend `storyRefs`/
  `demoDataReset` as before. Consider the Phase-7 code-splitting pass if
  the bundle keeps growing.

---

## Phase 4B — Specialist domains: shared §9 pattern + governance/ERM/cyber (20 Nov 2026)

Second chunk of Spec §21 Phase 4: the shared §9 page pattern built once and
instantiated for Corporate Governance (§9.1), Enterprise Risk Management
(§9.2) and IT & Cybersecurity (§9.3). Ten units, one commit each
(`33017ea`…docs), committed at fine cadence per the brief (the previous 4B
attempt died on a provider timeout with nothing committed).

**Built:**
- **Types** (`33017ea`) — `types/specialist.ts`: generic assessment /
  checklist / evidence / findings-row / report / dashboard / history shapes
  covering ALL six §9 domains so 4C reuses them unchanged; reuses the 4A
  `FrameworkMapping` relation and `SupervisoryDomain` keys. Later extended
  (unit 3) with the domain-config interfaces (`SpecialistDomainSpec`,
  submodules, checklist templates) and `SpecialistAssessmentDetail` /
  `SpecialistRequirementRef` so components consume config via the service,
  never fixtures.
- **Fixtures + repository** (`05622da`) — `specialist.fixture.ts`: domain
  configs for governance (9 submodules, GOV-01…06 templates mirroring
  LIB-GOV-001), ERM (8 submodules, ERM-01…06) and cyber (15 submodules,
  CYB-01…06 mirroring LIB-CYB-001, §9.3 evidence kinds: policy,
  architecture diagram, access review, vulnerability report, incident log,
  SOC alert, DR test, third-party assurance); 11 story-anchored assessments
  (GOVA-2026-001 Unity ↔ EXM-2026-021/FND-2026-118, GOVA-2026-002 Meridian
  ↔ FND-2026-109/OBL-2026-008, GOVA-2025-003 Vanguard ↔ FND-2026-037/
  CAP-2026-007/ENF-2026-002-chip, ERMA-2026-001 Northstar ↔ EWA-2026-011/
  SUB-2026-0144/EXM-2026-024/FND-2026-087, ERMA-2025-003 Vanguard ↔
  FND-2026-035/030, CYBA-2026-001 Crestline ↔ EXM-2026-005/FND-2026-066/
  062/CAP-2026-008, plus completed history rows), seeded checklists,
  evidence (incl. deliberately overdue requests) and reports. Three new
  `domain: 'erm'` requirements appended to `regulatory.fixture.ts`
  (MBA/PRU/2024 §2.1 ERM framework, §2.4 risk appetite/limits, §10.2
  stress-testing governance — appended at the end so the deterministic
  demoUuid sequence for existing requirements never shifts).
  `specialistRepository` (mutable session state, lifecycle + report state
  machines accepting reference-or-id, checklist generation from submodule
  keys, reset) registered in `demoDataReset`; `storyRefs.ts` gained
  `SPECIALIST_STORY` + `SPECIALIST_ASSESSMENT_ID_BY_REF`.
- **Service contract + role-gated mock** (`b2c779a`) — `SpecialistService`
  (domainSpec, dashboard, list, detail join, domainFindings + 12 mutations)
  and `MockSpecialistService` over the repository with `assertRegulator`
  gating; three new `DemoAction`s — `manage-specialist-assessments`
  (review tier + approval), `record-specialist-checklist` (fieldwork tier
  and above, later also granted to the cybersecurity-/aml-specialist role
  seeds), `approve-specialist-report` (approval tier only). Detail joins
  institution, checklist, evidence, findings, resolved §10.1 requirements
  (citation → record → frameworks-drawer deep link: the Phase-4 acceptance)
  and the §7 examination relation; notifications on create/submit/issue.
- **Shared §9 pattern** (`db6eca9`) — `src/features/specialist/`:
  `SpecialistDomainPage` (tabs Dashboard · Assessment register · Findings;
  `?assessment=REF` swaps in the detail; `?view=` + `?institution=`
  deep links), `SpecialistDashboardView` (5 KPI cards, demo maturity
  distribution bar chart with illustrative labelling, submodule coverage,
  institution posture table, story-anchor relations, §9.x submodule
  inventory), `SpecialistRegisterView` (DataTable + filters + gated create
  modal that generates the checklist from chosen submodules),
  `SpecialistAssessmentDetailView` (parts 3–8: overview with resolved
  requirement records, checklist grouped by submodule with conclusion
  drawer + criteria/requirement/finding chips, evidence with overdue
  marking and request/receive/review flows, findings, report with
  Draft → In Review → Issued (demo) workflow and simulated-dispatch
  honesty, history table), `panels.tsx` (shared FindingsTable,
  RelationsPanel, tone helpers, `makeWorkflowRunner` which releases `busy`
  BEFORE toasting — 4A `c5874e9` lesson applied).
- **Domain instances + router swaps** (`030c6e9`, `7539c4e`, `3d55817`) —
  `CorporateGovernancePage`, `EnterpriseRiskPage`, `CybersecurityPage`
  (thin wrappers passing domain + icon); only the three `specialist/*`
  `moduleRoute(...)` elements swapped, other specialist routes untouched.
- **Cross-wiring** (`25e0f41`) — global search gained a Specialist group
  (3 screens + 11 assessments, `ShieldCheck` icon); Examination Library
  gained `?search=` (initialises its search box) so the 4A requirement
  drawer's procedure chips and the specialist criteria chips land filtered
  — requirement↔procedure mapping now works both directions; Findings
  register gained `?search=`; institution-profile Risk tab gained a
  "Specialist supervision (Spec §9)" card deep-linking the three registers
  pre-filtered by `?institution=`.
- **Tests** (`62ec925`, `1df9b29`) — `specialistWorkflow.test.ts`
  (17 service-level tests: domain configs present/absent, register joins,
  dashboard aggregates, Phase-4 acceptance requirement resolution,
  domain-findings filtering, create gating + checklist generation +
  history, lifecycle and report state machines incl. invalid-transition
  `undefined` returns, evidence request/receive/review, §19 gating matrix
  incl. institution-role refusal and review-tier-never-approves) and
  `SpecialistDomainPage.test.tsx` (11 page-flow tests: three dashboards,
  register→detail, requirement chip → frameworks drawer, criteria chip →
  filtered library, story-anchor chips, overdue evidence, full report
  workflow with honesty assertions, examiner conclusion recording,
  read-only gating, create flow with generated checklist). Plural queries
  for header+body duplicates and explicit `unmount()` between double
  renders (3A lessons applied).

**Bugs found and fixed while testing:**
- `specialistRepository` lifecycle/report methods only matched by id while
  the service contract documents reference-or-id — `start()` with
  'GOVA-2026-001' silently returned undefined. All transitions now resolve
  via `getAssessment(referenceOrId)` (`62ec925`).
- Header and report-tab buttons were both named "Submit for review"
  (assessment vs report handoff) — header renamed "Submit assessment for
  review" (`1df9b29`).

**Verified (real output, 20 Nov 2026):**
- `npm run build` → tsc clean; ✓ built (>500 kB Recharts advisory
  unchanged, deferred to Phase 7).
- `npm run lint` → oxlint: **0 errors, 75 warnings** — baseline 66 + 9 new
  `set-state-in-effect` React-Compiler advisories on the new views'
  standard async-load pattern (same documented class as 2A–4A).
- `npm test` → **29 files, 184 tests, all passing** (156 prior + 28 new).

**Decisions / deviations:**
- No new libraries.
- The ERM domain needed `domain: 'erm'` requirements that the 4A fixture
  did not carry; they were appended (not inserted) to
  `REGULATORY_REQUIREMENTS` to keep the deterministic id sequence stable,
  and cite MBA/PRU/2024 §2.1/§2.4/§10.2 (fictional demo citations).
- Dashboard maturity distribution/submodule scores and posture trends are
  documented demo heuristics (labelled illustrative in the UI), derived
  from concluded checklist items — never presented as official ratings.
- `supervisory-team-lead` is approval tier (carries APPROVAL_ACTIONS);
  review-tier-never-approves assertions use `principal-examiner`.
- Checklist "criteria" chips reuse the library programme citations; the
  library now opens pre-filtered via `?search=`.

**Next chunk owes (Phase 4C — completes Phase 4, Spec §21/§9):**
- AML (§9.4 — anchors ready: EXM-2026-014 → FND-2026-101/107 →
  CAP-2026-003, DIR-2026-004 chip; templates can mirror LIB-AML-002
  AML-01…06), Operations (§9.5 — LIB-OPS-001, MBA/OPS/2026 §2.1,
  FND-2026-062/091/051) and Consumer Protection (§9.6 — MBA/CPC/2025
  requirements, OBL-2026-007). For each: add a `SpecialistDomainSpec` to
  `SPECIALIST_DOMAINS`, seed assessments/checklists/evidence/reports in
  `specialist.fixture.ts` (append at the end — deterministic ids), add a
  thin page wrapper and swap its `specialist/*` `moduleRoute(...)`
  placeholder. Types, repository, service, pattern components and tests
  need no structural change; extend the page-test suite per domain.
- Phase-4 acceptance close-out: render a specialist examination against
  regulatory requirement records end-to-end (4B demonstrated it on
  CYBA-2026-001 ↔ MBA/CYB/2025; 4C should show the AML side:
  an AML assessment alongside EXM-2026-014 ↔ MBA/AML/2023 §6.3/§4.1).
- Then Phase 5 (enforcement, reports, intelligence, peer benchmarking, AI
  assistant) per Spec §21; consider the Phase-7 code-splitting pass if the
  bundle keeps growing.

---

## Phase 4C — Specialist domains: AML / operations / consumer protection; Phase 4 complete (20 Nov 2026)

Final chunk of Spec §21 Phase 4: the shared §9 pattern instantiated for
AML/CFT/CPF (§9.4), Operations & Internal Controls (§9.5) and Consumer
Protection (§9.6), plus the Phase-4 acceptance close-out on the AML side.
Six units, one commit each (`3cac4c3`…docs), committed at fine cadence per
the brief (provider infrastructure has killed six agents on this project;
AML text is the highest content-filter risk, so the AML unit was banked
first).

**Built:**
- **AML/CFT/CPF** (`3cac4c3`, §9.4) — `aml` domain config in
  `SPECIALIST_DOMAINS`: nine §9.4 submodules (ML/TF/PF risk assessment,
  CDD/KYC/EDD, beneficial ownership, PEP & sanctions screening,
  transaction monitoring, STR, correspondent banking, AML governance &
  training, independent AML review), checklist templates AML-01…06
  mirroring LIB-AML-002 v2.2 (criteria refs match the library programme's
  `regulatoryMapping` so `?search=` chips land filtered), requirement
  citations MBA/AML/2023 §4.1/§5.1/§6.3 + §2.2 (2024 amendment). Three
  seeds appended (n12–14, deterministic demoUuid sequence unshifted):
  **AMLA-2026-001** (Meridian targeted review alongside EXM-2026-014,
  anchors FND-2026-101/107 → CAP-2026-003, DIR-2026-004 as the labelled
  non-link Phase-5 chip; AML-01/AML-03 concluded Deficient with the
  findings linked; overdue CAP milestone-plan evidence request),
  AMLA-2026-002 (Crestline Q4 thematic anchored to OBL-2026-006 +
  FND-2026-062 cross-domain referral), AMLA-2025-003 (Meridian 2025 full
  assessment history alongside EXM-2025-031, Needs Improvement, first
  identification of FND-2026-101). All AML sample-case text states
  fictional/anonymised (Spec §9.4). `AmlPage` wrapper (ScanSearch icon) +
  router swap; the 4B workflow test asserting `domainSpec('aml')` is
  undefined was updated in the same commit.
- **Operations & Internal Controls** (`d604764`, §9.5) — ten §9.5
  submodules, templates OPS-01…06 mirroring LIB-OPS-001 (OPS-01 is the
  library procedure verbatim; criteriaRef MBA/OPS/2026 §2.1 = the
  programme's regulatoryMapping). Seeds n15–18: **OPSA-2026-001**
  (Crestline, FND-2026-062 agent network, OPS-02 Deficient, citations
  resolve to the AI-drafted MBA/PSB/2026 §2.3 record while MBA/OPS/2026
  §2.1 renders the honest "not in the §10.1 demo library" label),
  OPSA-2026-002 (Northstar, FND-2026-091 mandate escalation via
  EXM-2026-009), OPSA-2026-003 (Delta, FND-2026-051 branch cash limits),
  OPSA-2025-004 (Vanguard 2025 history, FND-2026-039, CAP-2026-007 /
  ENF-2026-002 chip). `OperationsPage` (ClipboardCheck) + router swap.
- **Consumer Protection** (`2b16f54`, §9.6) — eight §9.6 submodules; NO
  library programme exists, so templates CPC-01…07 cite the MBA/CPC/2025
  requirements directly (§2.1 complaints, §3.1 fees, §4.2 fair
  treatment/consumer lending) plus MBA/NIB/2023 §3.2 for non-interest
  banks; the intro documents the §9.6 cross-department referral/ownership
  rule. Seeds n19–21: **CPA-2026-001** (Crestline review anchored to
  OBL-2026-007 Partial — Q3 report late, agent-dispute theme — with the
  §9.5/§9.4 referrals named in scope; CPC-01 Deficient), CPA-2026-002
  (Unity market conduct planned alongside EXM-2026-021, OBL-2026-012),
  CPA-2025-003 (Meridian Satisfactory 2025 thematic history).
  `ConsumerProtectionPage` (HeartHandshake) + router swap.
- **Cross-wiring / acceptance close-out** (`78783c7`) — global search
  Specialist group gained the three new screens (the ten new assessments
  flow automatically from `SPECIALIST_ASSESSMENTS`); institution-profile
  Risk tab "Specialist supervision (§9)" card now deep-links all six
  registers pre-filtered by `?institution=`; `SPECIALIST_STORY` gained
  `meridianAmlAssessmentId` / `crestlineOperationsAssessmentId` /
  `crestlineConsumerReviewId`. One minimal pattern-component change
  (justified per brief): the `SpecialistDomainPage` "domain not
  configured" ErrorState copy still said AML/ops/CP "ship in Phase 4C" —
  updated to past tense; no structural change. Types, repository, service
  contract and mock service were NOT touched — the 4B machinery is fully
  domain-generic as promised.
- **Tests** (`745bd95`) — `SpecialistDomains4C.test.tsx` (9 page-flow
  tests: three dashboards incl. §9.4–§9.6 submodule inventories and
  anonymised-data labelling, AML register→detail, the **Phase-4 acceptance
  click-through** (MBA/AML/2023 §6.3 → frameworks drawer with
  `requirement=` param), story anchors with DIR-2026-004 asserted as a
  labelled non-button chip, LIB-AML-002 checklist mirroring + criteria
  chip → filtered library, history tab, operations resolved-vs-uncatalogued
  citation honesty, consumer-protection OBL-2026-007 anchor) + one new
  service-level acceptance test in `specialistWorkflow.test.ts`
  (AMLA-2026-001 ↔ EXM-2026-014 ↔ MBA/AML/2023 §6.3/§4.1 with links,
  DIR-2026-004 link-less note, history + checklist findingRefs) and the
  all-six-domains config assertion. 4B plural-query/unmount lessons
  applied throughout.
- **Docs** (this commit) — README "What is built" → Phase 4 complete, all
  six specialist domains described, structure tree updated, "Known
  boundaries after Phase 4" (incl. the MBA/OPS/2026 citation gap and the
  consumer-protection library no-results note); PROGRESS 4C entry.

**Verified (real output, 20 Nov 2026):**
- `npm run build` → tsc clean; ✓ built (>500 kB Recharts advisory
  unchanged, deferred to Phase 7).
- `npm run lint` → oxlint: **0 errors, 75 warnings** — exactly the
  documented 4B baseline; 4C added no new advisories (no new
  effects/components with set-state patterns beyond the reused views).
- `npm test` → **30 files, 194 tests, all passing** (184 prior + 10 new:
  9 page-flow + 1 service-level acceptance).

**Phase-4 acceptance evidence (§21):** AMLA-2026-001 (Meridian AML/CFT
programme assessment) renders alongside EXM-2026-014 against the
MBA/AML/2023 §6.3 (transaction monitoring) and §4.1 (customer due
diligence) requirement records with two-way deep links into the §10.1
frameworks drawer — same shape as the 4B cyber acceptance (CYBA-2026-001 ↔
MBA/CYB/2025). Proven by: service test "resolves the AML acceptance
citations — AMLA-2026-001 ↔ EXM-2026-014 ↔ MBA/AML/2023 (Phase-4
close-out)" and page test "resolves MBA/AML/2023 §6.3 into the §10.1
frameworks drawer (Phase-4 acceptance, AML side)". The §10.1 side already
carried the reverse anchors (requirement §6.3 → EXM-2026-014/FND-2026-101/
CAP-2026-003/DIR-2026-004 chips) since 4A.

**Decisions / deviations:**
- No new libraries; no changes to `types/specialist.ts`,
  `specialistRepository`, `SpecialistService`/mock or the pattern views
  (single justified copy fix above).
- `AssessmentSeed['domain']` union widened to all six domains (fixture-
  internal interface, not a shared type).
- MBA/OPS/2026 has no framework/requirement record in the 4A §10.1
  library; rather than mutate the 4A fixture, operations templates keep
  MBA/OPS/2026 §2.1 as the library-matching criteriaRef (chip → filtered
  library) and use it as an honestly-labelled unresolved requirement
  citation, while OPS-02/03 resolve through the AI-drafted MBA/PSB/2026
  §2.3/§3.1 records (whose own anchors already point at FND-2026-062).
  Documented in README boundaries; a Phase 5/7 pass may add the framework.
- Consumer-protection criteria chips cite MBA/CPC/2025 directly; the
  library opens in its designed no-results state (no programme exists for
  §9.6) — noted in README boundaries.
- One seed-ordering note: all 4C seeds were APPENDED (n12–21) so the
  deterministic demoUuid sequence and every existing story anchor kept
  their ids; `SPECIALIST_STORY` only gained keys.

**Next chunk owes (Phase 5 — enforcement, intelligence and reports; Spec §21):**
- Enforcement cases + detail, supervisory directives (DIR-2026-002/004
  chips become live targets), sanctions & penalties, corrective action
  plans register (CAP-2026-002/003/007/008 exist in fixtures), supervisory
  reports, industry intelligence, peer benchmarking, systemic risk, AI
  assistant (labelled "Demo AI response" per §17.4). Swap the Phase-5
  `moduleRoute(...)` placeholders only.
- Journeys C and E (§22) must be demonstrable at the end of Phase 5. The
  fixture anchors are ready: ENF-2026-001/002, DIR-2026-002/004, the CAP
  population, Vanguard restructuring story, and the Q4 2026 thematic cycle
  (AML & cyber resilience) for intelligence/report content.
- `relationFromRef`/`relationFor` in `regulatory.fixture.ts` currently
  force `link: undefined` for directive/enforcement kinds (Phase-5 label) —
  Phase 5 replaces that with real routes; every chip already carries the
  refs it needs.
- Consider the Phase-7 code-splitting pass if the bundle keeps growing.

