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

## What is built (Phase 1 + Phase 2A)

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
- **Coherent demo dataset** — eight fictional institutions (Meridian
  Commercial Bank, Northstar Merchant Bank, Unity Non-Interest Bank,
  Crestline Payment Bank, Aurora Savings & Loans, Delta Microfinance,
  Sentinel Custody & Trust, Vanguard Regional Bank) plus examinations,
  findings, returns, alerts, risk assessments, plans, corrective actions,
  enforcement cases and a work queue telling one story (Spec §17.5). The
  dataset already contains the entities Phase 2B screens will render.

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
│   ├── charts/     chartTheme, RiskDonut, PortfolioCategoryBar, PrudentialTrendChart
│   ├── ui/         Button, Card, StatCard, Badges, Modal, ConfirmDialog,
│   │               Drawer, Tabs, Progress, PageHeader, DropdownMenu, UserAvatar
│   ├── forms/      TextInput, TextArea, Select, Checkbox, Toggle
│   ├── data-display/ DataTable (sorting, pagination, selection, actions)
│   ├── navigation/ Breadcrumbs, GlobalSearchOverlay (⌘K), ModulePlaceholder
│   └── feedback/   ToastHost + toastStore, EmptyState/LoadingSkeleton/ErrorState
├── config/         navigation.ts (Spec §3.2 nav tree), roles.ts (§19 profiles)
├── features/       auth/, dashboard/, institutions/, work/, errors/
├── hooks/          useMediaQuery (responsive shell)
├── layouts/        RegulatorLayout, AuthLayout, InstitutionPortalLayout
├── mocks/          fixtures/ + repositories/ (never imported by components)
├── services/
│   ├── contracts/  AuthService, NotificationService, SearchService,
│   │               InstitutionService (+Branch/Director), DashboardService,
│   │               WorkQueueService, SupervisionReadService (+QueueCounts)
│   └── mock/       Mock* implementations over the repositories
├── store/          sessionStore, notificationStore, uiStore, navCountStore
├── styles/         tokens.css, index.css
└── types/          auth.ts, common.ts, institution.ts, supervision.ts
```

**Rule (Spec §18.3):** components import service *interfaces* from
`src/services/contracts`; only mock services touch `src/mocks/repositories`.
A future `Api*Service` (Spring Boot) slots in without redesigning screens.

## Responsive behaviour (Spec §2.6)

- **≥1024px:** full 250px navy sidebar (user-toggleable to 72px rail).
- **768–1023px:** sidebar forced to 72px icon rail with hover tooltips.
- **<768px:** sidebar becomes an overlay drawer (topbar menu trigger,
  Escape/backdrop closes); grids stack; tables scroll horizontally.

## Known boundaries after Phase 2A

- Risk assessments, supervisory plans, examinations (register/wizard/detail/
  workspace), examination library, evidence, findings and remediation still
  render designed placeholders — Phase 2B builds them over the same dataset.
  Profile tabs and Command Centre links to those modules are read-only.
- Global search and dashboard deep-links to Phase 3+ modules (returns,
  early warnings, enforcement) land on placeholders until their phase.
- Portal screens remain Phase 6 placeholders; portal roles only switch the
  layout and navigation visibility.

See `PROGRESS.md` for the phase-by-phase build log.
