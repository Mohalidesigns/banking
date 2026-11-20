import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { SpecialistDomainPage } from '@/features/specialist/SpecialistDomainPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'
import type { SupervisoryDomain } from '@/types/regulatory'

/**
 * Shared §9 specialist page pattern — page flows for the three Phase-4B
 * domains: domain dashboard, assessment register → detail navigation, the
 * Phase-4 acceptance requirement chips, checklist criteria deep-links into
 * the examination library, the evidence/report workflows, §19 role gating
 * and the create-assessment flow. Detail text appears in both the header and
 * the body — plural queries are used deliberately (3A lesson).
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
const EXAMINER = user('examiner', 'Samuel Ike', 'SI')
const READ_ONLY = user('read-only-supervisor', 'Robin Vale', 'RV')

const ROUTES: Record<string, SupervisoryDomain> = {
  governance: 'governance',
  erm: 'erm',
  cybersecurity: 'cybersecurity',
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

describe('Specialist §9 pattern — domain dashboards (part 1)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the governance dashboard with KPIs, submodule coverage and demo labelling', async () => {
    renderDomain('governance')
    expect(
      await screen.findByText('Institutions covered', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Active assessments')).toBeInTheDocument()
    expect(screen.getByText('Overdue evidence')).toBeInTheDocument()
    expect(screen.getByText(/Submodule coverage/)).toBeInTheDocument()
    // §9.1 submodule inventory is rendered from the domain config (the
    // coverage list and the submodule card both name each submodule).
    expect(screen.getAllByText('Board composition').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Director fit-and-proper assessments').length).toBeGreaterThan(0)
    // Prototype honesty.
    expect(screen.getAllByText(/fictional demo data/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/illustrative/i).length).toBeGreaterThan(0)
  })

  it('renders the ERM and cybersecurity dashboards from the same pattern', async () => {
    const erm = renderDomain('erm')
    expect(
      await screen.findByText('Demo maturity distribution', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Risk appetite').length).toBeGreaterThan(0)
    erm.unmount()

    renderDomain('cybersecurity')
    expect(
      await screen.findByText('Demo maturity distribution', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    // §9.3 submodule inventory.
    expect(screen.getAllByText('Vulnerability management').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SOC/SIEM and threat monitoring').length).toBeGreaterThan(0)
  })
})

describe('Specialist §9 pattern — register and detail navigation (parts 2–3)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('lists seeded governance assessments and opens the detail from a row', async () => {
    const user1 = userEvent.setup()
    renderDomain('governance')
    await screen.findByText('Institutions covered', {}, { timeout: 4000 })
    await user1.click(screen.getByRole('tab', { name: /Assessment register/i }))

    expect(await screen.findByText('GOVA-2026-002', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('GOVA-2026-001')).toBeInTheDocument()

    await user1.click(screen.getByText('GOVA-2026-002'))
    // Detail header + body both render the title (3A lesson: plural query).
    expect(
      (await screen.findAllByText(/Board risk reporting thematic review/i, {}, { timeout: 4000 })).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Regulatory requirements assessed')).toBeInTheDocument()
    // Tabs for pattern parts 4–8.
    expect(screen.getByRole('tab', { name: /Checklist & procedures/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Historical assessments/i })).toBeInTheDocument()
  })

  it('resolves requirement citations into the §10.1 frameworks drawer (Phase-4 acceptance)', async () => {
    const user1 = userEvent.setup()
    renderDomain('cybersecurity', DEPUTY, '?assessment=CYBA-2026-001')

    // The overview lists resolved requirements as navigable links; open the
    // MBA/CYB/2025 §5.2 one (third-party risk — the Crestline story anchor).
    expect(
      await screen.findByText('Regulatory requirements assessed', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    const citation = (await screen.findAllByText('MBA/CYB/2025 §5.2', {}, { timeout: 4000 }))[0]
    const reqItem = citation.closest('li') as HTMLElement
    await user1.click(within(reqItem).getByRole('button', { name: /Open requirement/i }))
    const echo = await screen.findByTestId('route-echo', {}, { timeout: 4000 })
    expect(echo.textContent).toContain('/app/regulatory/frameworks')
    expect(echo.textContent).toContain('MBA%2FCYB%2F2025')
    expect(echo.textContent).toContain('requirement=')
  })

  it('shows story-anchor relation chips on the cyber assessment detail', async () => {
    renderDomain('cybersecurity', DEPUTY, '?assessment=CYBA-2026-001')
    await screen.findByText('Cross-module references', {}, { timeout: 4000 })
    // EXM-2026-005 resolves to a real link chip; CAP-2026-008 links the remediation register.
    expect(screen.getAllByRole('button', { name: /EXM-2026-005/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /CAP-2026-008/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /FND-2026-066/ }).length).toBeGreaterThan(0)
  })
})

describe('Specialist §9 pattern — checklist, evidence and report (parts 4, 5, 7)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('deep-links checklist criteria into the examination library and shows deficient conclusions', async () => {
    const user1 = userEvent.setup()
    renderDomain('cybersecurity', DEPUTY, '?assessment=CYBA-2026-001')
    await user1.click(await screen.findByRole('tab', { name: /Checklist & procedures/i }, { timeout: 4000 }))

    // CYB-01 was concluded Deficient with FND-2026-066 linked.
    expect(await screen.findByText('CYB-01', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Deficient').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /FND-2026-066/ }).length).toBeGreaterThan(0)
    // Library programme chip.
    expect(screen.getAllByRole('button', { name: /LIB-CYB-001/ }).length).toBeGreaterThan(0)

    // Criteria chip opens the library pre-filtered (?search= added in 4B).
    const criteria = screen.getAllByRole('button', { name: /MBA\/CYB\/2025 §5\.2 →/ })
    await user1.click(criteria[0])
    const echo = await screen.findByTestId('route-echo', {}, { timeout: 4000 })
    expect(echo.textContent).toContain('/app/examination-library')
    expect(echo.textContent).toContain('search=MBA%2FCYB%2F2025')
  })

  it('marks overdue evidence requests and offers the gated request flow', async () => {
    const user1 = userEvent.setup()
    renderDomain('cybersecurity', DEPUTY, '?assessment=CYBA-2026-001')
    await user1.click(await screen.findByRole('tab', { name: /^Evidence/i }, { timeout: 4000 }))

    // The seeded DR test request is past its demo due date.
    expect(await screen.findByText(/DR test report \(core payments\)/, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText(/overdue/i).length).toBeGreaterThan(0)
    // §9.3 domain-specific evidence kinds are visible on the seeded items.
    expect(screen.getAllByText('Third-party assurance').length).toBeGreaterThan(0)

    // Deputy (management tier) can request evidence; the modal is honest about simulation.
    await user1.click(screen.getByRole('button', { name: /Request evidence/i }))
    expect(await screen.findByText(/Request evidence \(demo\)/, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText(/no communication is sent/i).length).toBeGreaterThan(0)
  })

  it('runs the report Draft → In Review → Issued (demo) workflow with simulated-dispatch honesty', async () => {
    const user1 = userEvent.setup()
    renderDomain('cybersecurity', DEPUTY, '?assessment=CYBA-2026-001')
    await user1.click(await screen.findByRole('tab', { name: /^Report$/i }, { timeout: 4000 }))

    const submitBtn = await screen.findByRole('button', { name: /^Submit for review$/i }, { timeout: 4000 })
    await user1.click(submitBtn)
    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getAllByText('In Review').length).toBeGreaterThan(0),
    )

    await user1.click(screen.getByRole('button', { name: /Issue report \(demo\)/i }))
    expect(await screen.findByText(/Issue report \(simulated\)\?/i, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText(/SIMULATION/i).length).toBeGreaterThan(0)

    await user1.click(screen.getByRole('button', { name: /^Issue \(demo\)$/i }))
    await waitFor(
      () => expect(screen.getAllByText('Issued (demo)').length).toBeGreaterThan(0),
      { timeout: 4000 },
    )
    // Prototype honesty: issuance states nothing real was sent.
    expect(screen.getAllByText(/no real report is issued|never sends real communications/i).length).toBeGreaterThan(0)
  })

  it('lets an examiner record a checklist conclusion (fieldwork tier)', async () => {
    const user1 = userEvent.setup()
    renderDomain('cybersecurity', EXAMINER, '?assessment=CYBA-2026-001')
    await user1.click(await screen.findByRole('tab', { name: /Checklist & procedures/i }, { timeout: 4000 }))

    // CYB-06 (DR/BCP) is the only Not Started item → 'Record conclusion'.
    const recordBtn = await screen.findByRole('button', { name: /^Record conclusion$/i }, { timeout: 4000 })
    await user1.click(recordBtn)
    expect(await screen.findByText(/Record conclusion — CYB-06/, {}, { timeout: 4000 })).toBeInTheDocument()

    await user1.click(screen.getByRole('button', { name: /Save conclusion/i }))
    expect(
      (await screen.findAllByText('Saved in prototype session', {}, { timeout: 4000 })).length,
    ).toBeGreaterThan(0)
    await waitFor(() => {
      const item = screen.getAllByText('CYB-06')[0].closest('li')
      expect(item?.textContent).toContain('Satisfactory')
      expect(item?.textContent).toContain('Samuel Ike')
    })
  })
})

describe('Specialist §9 pattern — §19 role gating', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('hides every mutation from the read-only supervisor', async () => {
    const { unmount } = renderDomain('cybersecurity', READ_ONLY, '?assessment=CYBA-2026-001')
    await screen.findByText('Regulatory requirements assessed', {}, { timeout: 4000 })
    expect(screen.queryByRole('button', { name: /Record conclusion|Update conclusion/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Request evidence/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Submit for review/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Complete assessment/i })).toBeNull()
    unmount()

    renderDomain('governance', READ_ONLY)
    await screen.findByText('Institutions covered', {}, { timeout: 4000 })
    await userEvent.setup().click(screen.getByRole('tab', { name: /Assessment register/i }))
    await screen.findByText('GOVA-2026-002', {}, { timeout: 4000 })
    expect(screen.queryByRole('button', { name: /New assessment/i })).toBeNull()
  })
})

describe('Specialist §9 pattern — create assessment (part 2 workflow)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('creates a governance assessment and generates the checklist from the chosen submodules', async () => {
    const user1 = userEvent.setup()
    renderDomain('governance')
    await screen.findByText('Institutions covered', {}, { timeout: 4000 })
    await user1.click(screen.getByRole('tab', { name: /Assessment register/i }))
    // Wait for the register rows so the create modal's institution select is populated.
    await screen.findByText('GOVA-2026-002', {}, { timeout: 4000 })
    await user1.click(screen.getByRole('button', { name: /New assessment/i }))

    expect(await screen.findByText(/New corporate governance assessment \(demo\)/i, {}, { timeout: 4000 })).toBeInTheDocument()

    const instSelect = screen.getByLabelText(/^Institution/i) as HTMLSelectElement
    const meridianOption = Array.from(instSelect.options).find((o) =>
      o.textContent?.includes('Meridian Commercial Bank'),
    )!
    await user1.selectOptions(instSelect, meridianOption.value)
    await user1.type(screen.getByLabelText(/^Title/i), 'Meridian governance follow-up (demo)')
    await user1.type(screen.getByLabelText(/^Period covered/i), 'Q4 2026')
    fireEvent.change(screen.getByLabelText(/^Start date/i), { target: { value: '2026-12-01' } })
    fireEvent.change(screen.getByLabelText(/^Target date/i), { target: { value: '2027-01-15' } })
    await user1.type(screen.getByLabelText(/Scope summary/i), 'Follow-up on board risk reporting (demo).')
    await user1.click(screen.getByRole('checkbox', { name: /Board composition/i }))

    await user1.click(screen.getByRole('button', { name: /^Create assessment$/i }))

    expect(
      (await screen.findAllByText('Saved in prototype session', {}, { timeout: 4000 })).length,
    ).toBeGreaterThan(0)
    // Lands on the new assessment's detail; references continue the 2026 sequence.
    expect((await screen.findAllByText(/GOVA-2026-003/, {}, { timeout: 4000 })).length).toBeGreaterThan(0)
    expect(
      (await screen.findAllByText(/Meridian governance follow-up \(demo\)/i, {}, { timeout: 4000 })).length,
    ).toBeGreaterThan(0)

    // The checklist was generated from the single chosen submodule (GOV-01 only).
    await user1.click(screen.getByRole('tab', { name: /Checklist & procedures/i }))
    const panel = screen.getByRole('tabpanel')
    await waitFor(() => expect(within(panel).getByText('GOV-01')).toBeInTheDocument())
    expect(within(panel).queryByText('GOV-02')).toBeNull()
  })
})
