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
  (Meridian Commercial Bank) or `NMB-002` (Northstar Merchant Bank), any
  email/password. Routes to `/portal/dashboard`.
- Forgot/reset password flows at `/forgot-password` and `/reset-password`
  are simulated (demo token `DEMO-RESET`).
- The topbar user menu can **switch demo roles** at any time — clearly
  labelled "DEMO ROLE — NOT SECURE AUTHENTICATION".

Session state (demo user, jurisdiction, sidebar/nav-group state) persists
in `localStorage` under `atheris-reg-prototype-session`. Clear that key to
reset the demo session.

## Stack

TypeScript (TSX) · Vite 8 · React 19 · react-router 8 (data router) ·
Tailwind CSS v4 (`@tailwindcss/vite`, tokens via `@theme inline`) ·
TanStack Table v8 · Zustand · Lucide React icons · Fontsource variable
fonts (Inter, Roboto Mono — bundled locally, no CDN) · Vitest +
React Testing Library. React Hook Form + Zod and Recharts are intentionally
deferred to the phases that first need them (Spec §18.1).

## Design tokens

Declared **once** in `src/styles/tokens.css` (CSS variables, `--tld-*`) and
mapped into Tailwind utilities in `src/styles/index.css` (`@theme inline`):
`bg-primary`, `text-ink-secondary`, `border-line`, `bg-tint-green`,
`shadow-card`, `text-heat-critical`, etc. Never hardcode hex values in
components — reference the tokens.

## Structure (Spec §18.2)

```
src/
├── app/            router.tsx, handle.ts (route metadata)
├── components/
│   ├── brand/      BrandLogo
│   ├── ui/         Button, Card, StatCard, Badges, Modal, ConfirmDialog,
│   │               Drawer, Tabs, Progress, PageHeader, DropdownMenu, UserAvatar
│   ├── forms/      TextInput, TextArea, Select, Checkbox, Toggle
│   ├── data-display/ DataTable (sorting, pagination, selection, actions)
│   ├── navigation/ Breadcrumbs, GlobalSearchOverlay (⌘K), ModulePlaceholder
│   └── feedback/   ToastHost + toastStore, EmptyState/LoadingSkeleton/ErrorState
├── config/         navigation.ts (full Spec §3.2 nav tree + portal nav)
├── features/       auth/, dashboard/, errors/ (module screens per phase)
├── hooks/          useMediaQuery (responsive shell)
├── layouts/        RegulatorLayout, AuthLayout, InstitutionPortalLayout
├── mocks/          fixtures/ + repositories/ (never imported by components)
├── services/
│   ├── contracts/  AuthService, NotificationService, SearchService
│   └── mock/       MockAuthService, MockNotificationService, MockSearchService
├── store/          sessionStore, notificationStore, uiStore (Zustand)
├── styles/         tokens.css, index.css
└── types/          auth.ts, common.ts
```

**Rule (Spec §18.3):** components import service *interfaces* from
`src/services/contracts`; only mock services touch `src/mocks/repositories`.
A future `Api*Service` (Spring Boot) slots in without redesigning screens.

## Responsive behaviour (Spec §2.6)

- **≥1024px:** full 250px navy sidebar (user-toggleable to 72px rail).
- **768–1023px:** sidebar forced to 72px icon rail with hover tooltips.
- **<768px:** sidebar becomes an overlay drawer (topbar menu trigger,
  Escape/backdrop closes); grids stack; tables scroll horizontally.

## Known Phase 1 boundaries

- Module screens other than the shell render a designed
  "Module scheduled for Phase N" placeholder — every Spec §4 route (plus
  sidebar-only routes) is registered, so there are no dead ends.
- `DemoRole` ids are provisional until reconciled with Spec §19 (Phase 2+).
- Global search deep-links to module routes that are placeholders until
  their phase lands.

See `PROGRESS.md` for the phase-by-phase build log.
