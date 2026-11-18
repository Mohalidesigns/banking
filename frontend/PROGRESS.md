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
