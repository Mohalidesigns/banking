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
