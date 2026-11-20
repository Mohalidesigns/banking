import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { SpecialistDomainPage } from '@/features/specialist/SpecialistDomainPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'
import type { SupervisoryDomain } from '@/types/regulatory'

/**
 * Phase 4C — the three new §9 domains (AML §9.4, operations §9.5, consumer
 * protection §9.6) on the shared pattern, plus the Phase-4 acceptance
 * close-out on the AML side: AMLA-2026-001 rendered alongside EXM-2026-014
 * against the MBA/AML/2023 §6.3/§4.1 requirement records with deep links
 * into the §10.1 frameworks drawer (same shape as the 4B cyber acceptance).
 * 3A/4B lessons applied: plural queries for header+body duplicates and
 * explicit unmount() between double renders.
 */

const user = (role: DemoRole, name: string, initials: string): DemoUser => ({
  id: `test-${role}`,
  fullName: name,
  email: `${initials.toLowerCase()}@meridia-central.gov`,
  initials,
  jobTitle: name,
  role,
  jurisdictionIds: [],
})

const DEPUTY = user('deputy-director', 'Tunde Bakare', 'TB')

const ROUTES: Record<string, SupervisoryDomain> = {
  aml: 'aml',
  operations: 'operations',
  'consumer-protection': 'consumer-protection',
}

function RouteEcho() {
  const location = useLocation()
  return (
    <div data-testid="route-echo">
      {location.pathname}
      {location.search}
    </div>
  )
}

function renderDomain(
  segment: keyof typeof ROUTES,
  currentUser: DemoUser = DEPUTY,
  search = '',
) {
  useSessionStore.setState({ currentUser, jurisdictions: [], jurisdiction: null })
  const domain = ROUTES[segment]
  const router = createMemoryRouter(
    [
      {
        path: `/app/specialist/${segment}`,
        Component: () => <SpecialistDomainPage domain={domain} />,
      },
      { path: '*', Component: RouteEcho },
    ],
    { initialEntries: [`/app/specialist/${segment}${search}`] },
  )
  return render(
    <>
      <RouterProvider router={router} />
      <ToastHost />
    </>,
  )
}

describe('Phase 4C — domain dashboards (§9.4–§9.6, pattern part 1)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the AML dashboard with the §9.4 submodule inventory and demo labelling', async () => {
    renderDomain('aml')
    expect(
      await screen.findByText('Institutions covered', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Active assessments')).toBeInTheDocument()
    expect(screen.getByText('Overdue evidence')).toBeInTheDocument()
    expect(screen.getAllByText('Transaction monitoring').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PEP and sanctions screening').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/fictional demo data/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/anonymised/i).length).toBeGreaterThan(0)
  })

  it('renders the operations and consumer-protection dashboards from the same pattern', async () => {
    const ops = renderDomain('operations')
    expect(
      await screen.findByText('Demo maturity distribution', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Cash/vault').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Maker-checker').length).toBeGreaterThan(0)
    ops.unmount()

    renderDomain('consumer-protection')
    expect(
      await screen.findByText('Demo maturity distribution', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Customer complaints').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Digital channel disputes').length).toBeGreaterThan(0)
  })
})

describe('Phase 4C — AML register → detail and Phase-4 acceptance (§9.4)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('lists the seeded AML assessments and opens the Meridian detail from a row', async () => {
    const user1 = userEvent.setup()
    renderDomain('aml')
    await screen.findByText('Institutions covered', {}, { timeout: 4000 })
    await user1.click(screen.getByRole('tab', { name: /Assessment register/i }))

    expect(await screen.findByText('AMLA-2026-001', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('AMLA-2026-002')).toBeInTheDocument()
    expect(screen.getByText('AMLA-2025-003')).toBeInTheDocument()

    await user1.click(screen.getByText('AMLA-2026-001'))
    // Detail header + body both render the title (3A lesson: plural query).
    expect(
      (await screen.findAllByText(/AML\/CFT programme assessment/i, {}, { timeout: 4000 })).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Regulatory requirements assessed')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Checklist & procedures/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Historical assessments/i })).toBeInTheDocument()
  })

  it('resolves MBA/AML/2023 §6.3 into the §10.1 frameworks drawer (Phase-4 acceptance, AML side)', async () => {
    const user1 = userEvent.setup()
    renderDomain('aml', DEPUTY, '?assessment=AMLA-2026-001')

    expect(
      await screen.findByText('Regulatory requirements assessed', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    // Both acceptance citations resolve; §4.1 renders alongside §6.3.
    expect(screen.getAllByText('MBA/AML/2023 §4.1').length).toBeGreaterThan(0)
    const citation = (await screen.findAllByText('MBA/AML/2023 §6.3', {}, { timeout: 4000 }))[0]
    const reqItem = citation.closest('li') as HTMLElement
    await user1.click(within(reqItem).getByRole('button', { name: /Open requirement/i }))
    const echo = await screen.findByTestId('route-echo', {}, { timeout: 4000 })
    expect(echo.textContent).toContain('/app/regulatory/frameworks')
    expect(echo.textContent).toContain('MBA%2FAML%2F2023')
    expect(echo.textContent).toContain('requirement=')
  })

  it('anchors the AML story with DIR-2026-004 as a labelled non-link Phase-5 chip', async () => {
    renderDomain('aml', DEPUTY, '?assessment=AMLA-2026-001')
    await screen.findByText('Cross-module references', {}, { timeout: 4000 })
    // EXM-2026-014, the findings and the CAP resolve to navigable chips.
    expect(screen.getAllByRole('button', { name: /EXM-2026-014/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /FND-2026-101/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /FND-2026-107/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /CAP-2026-003/ }).length).toBeGreaterThan(0)
    // DIR-2026-004 is a Phase-5 target: labelled chip, never a broken link.
    expect(screen.getAllByText('DIR-2026-004').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /DIR-2026-004/ })).toBeNull()
  })

  it('mirrors LIB-AML-002 on the checklist tab with deficient conclusions and finding links', async () => {
    const user1 = userEvent.setup()
    renderDomain('aml', DEPUTY, '?assessment=AMLA-2026-001')
    await user1.click(await screen.findByRole('tab', { name: /Checklist & procedures/i }, { timeout: 4000 }))

    expect(await screen.findByText('AML-01', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Deficient').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /FND-2026-101/ }).length).toBeGreaterThan(0)
    // Library programme chip (LIB-AML-002 mirroring).
    expect(screen.getAllByRole('button', { name: /LIB-AML-002/ }).length).toBeGreaterThan(0)

    // Criteria chip opens the examination library pre-filtered (?search=).
    const criteria = screen.getAllByRole('button', { name: /MBA\/AML\/2023 §6\.3 →/ })
    await user1.click(criteria[0])
    const echo = await screen.findByTestId('route-echo', {}, { timeout: 4000 })
    expect(echo.textContent).toContain('/app/examination-library')
    expect(echo.textContent).toContain('search=MBA%2FAML%2F2023')
  })

  it('shows the 2025 full assessment on the history tab (pattern part 8)', async () => {
    const user1 = userEvent.setup()
    renderDomain('aml', DEPUTY, '?assessment=AMLA-2026-001')
    await user1.click(await screen.findByRole('tab', { name: /Historical assessments/i }, { timeout: 4000 }))
    expect(await screen.findByText('AMLA-2025-003', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText(/Needs Improvement/).length).toBeGreaterThan(0)
  })
})

describe('Phase 4C — operations and consumer protection details (§9.5, §9.6)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('resolves the AI-drafted PSB requirement and labels the uncatalogued MBA/OPS citation honestly', async () => {
    const user1 = userEvent.setup()
    renderDomain('operations', DEPUTY, '?assessment=OPSA-2026-001')
    expect(
      await screen.findByText('Regulatory requirements assessed', {}, { timeout: 4000 }),
    ).toBeInTheDocument()

    // MBA/PSB/2026 §2.3 (draft) is in the §10.1 library → navigable link.
    const draft = (await screen.findAllByText('MBA/PSB/2026 §2.3 (draft)', {}, { timeout: 4000 }))[0]
    const draftItem = draft.closest('li') as HTMLElement
    expect(within(draftItem).getByRole('button', { name: /Open requirement/i })).toBeInTheDocument()

    // MBA/OPS/2026 §2.1 has no §10.1 record — reference label only, no dead end.
    const ops = screen.getAllByText('MBA/OPS/2026 §2.1')[0]
    const opsItem = ops.closest('li') as HTMLElement
    expect(within(opsItem).getByText(/Citation not in the §10\.1 demo library/i)).toBeInTheDocument()

    // The Crestline agent-network story anchors are navigable; OPS-02 is deficient.
    expect(screen.getAllByRole('button', { name: /FND-2026-062/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /EXM-2026-005/ }).length).toBeGreaterThan(0)
    await user1.click(screen.getByRole('tab', { name: /Checklist & procedures/i }))
    expect(await screen.findByText('OPS-02', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Deficient').length).toBeGreaterThan(0)
  })

  it('anchors the consumer-protection review to OBL-2026-007 and resolves MBA/CPC/2025', async () => {
    renderDomain('consumer-protection', DEPUTY, '?assessment=CPA-2026-001')
    expect(
      await screen.findByText('Regulatory requirements assessed', {}, { timeout: 4000 }),
    ).toBeInTheDocument()

    // MBA/CPC/2025 §2.1 resolves into the frameworks drawer (no library
    // programme exists for §9.6 — templates cite requirements directly).
    const citation = (await screen.findAllByText('MBA/CPC/2025 §2.1', {}, { timeout: 4000 }))[0]
    const reqItem = citation.closest('li') as HTMLElement
    expect(within(reqItem).getByRole('button', { name: /Open requirement/i })).toBeInTheDocument()

    // The obligation anchor is navigable; the agent-dispute referral chip too.
    expect(screen.getAllByRole('button', { name: /OBL-2026-007/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /FND-2026-062/ }).length).toBeGreaterThan(0)
  })
})
