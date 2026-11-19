import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { RegulatoryObligationsPage } from '@/features/regulatory/RegulatoryObligationsPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Regulatory Obligations (Spec §10.2): the register with §10.2 columns and
 * compliance rollups, the STR obligation detail anchored to the Meridian
 * AML story (CAP-2026-003 link, DIR-2026-004 Phase-5 chip), the gated
 * review workflow, and §19 gating (deputy vs read-only).
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
const READ_ONLY = user('read-only-supervisor', 'Robin Vale', 'RV')

function RouteEcho() {
  const location = useLocation()
  return (
    <div data-testid="route-echo">
      {location.pathname}
      {location.search}
    </div>
  )
}

function renderPage(currentUser: DemoUser = DEPUTY, entry = '/app/regulatory/obligations') {
  useSessionStore.setState({ currentUser, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/regulatory/obligations', Component: RegulatoryObligationsPage },
      { path: '*', Component: RouteEcho },
    ],
    { initialEntries: [entry] },
  )
  return render(
    <>
      <RouterProvider router={router} />
      <ToastHost />
    </>,
  )
}

describe('Regulatory Obligations page (§10.2)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the obligation register with rollups, overdue reviews and demo labelling', async () => {
    renderPage()
    expect(await screen.findByText('Obligation register', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Illustrative demo data').length).toBeGreaterThan(0)
    // Register is sorted by reference and paginates at 10 rows (page 1).
    for (const ref of ['OBL-2026-001', 'OBL-2026-004', 'OBL-2026-010']) {
      expect(screen.getAllByText(ref).length).toBeGreaterThan(0)
    }
    // Worst-case rollups and the seeded overdue review are visible.
    expect(screen.getAllByText('Non-Compliant').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0)
    // Framework citations link into the §10.1 library.
    expect(screen.getAllByRole('button', { name: /MBA\/AML\/2023/ }).length).toBeGreaterThan(0)
  })

  it('opens the STR obligation with the Meridian anchors — CAP links, DIR is a Phase-5 chip', async () => {
    const user1 = userEvent.setup()
    renderPage(DEPUTY, '/app/regulatory/obligations?obligation=OBL-2026-004')

    // Overview shows the source framework and requirement deep-link chips.
    expect(await screen.findByText('Source requirements (§10.1)', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /§6\.3/ }).length).toBeGreaterThan(0)

    await user1.click(screen.getByRole('tab', { name: /Applicable institutions/i }))

    // Meridian is Non-Compliant on the 24-hour STR obligation.
    expect(await screen.findByText(/Transaction monitoring rules missed structured deposits/i, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Non-Compliant').length).toBeGreaterThan(0)

    // CAP-2026-003 resolves to the remediation register (real link)…
    expect(screen.getAllByRole('button', { name: /CAP-2026-003/ }).length).toBeGreaterThan(0)
    // …while DIR-2026-004 is a Phase-5 placeholder: a chip, never a link.
    const dirChips = screen.getAllByText('DIR-2026-004')
    expect(dirChips.length).toBeGreaterThan(0)
    expect(dirChips.some((el) => el.closest('button') !== null)).toBe(false)
    expect(screen.queryByRole('button', { name: /DIR-2026-004/ })).toBeNull()
  })

  it('navigates from the source requirement chip into the framework detail', async () => {
    const user1 = userEvent.setup()
    renderPage(DEPUTY, '/app/regulatory/obligations?obligation=OBL-2026-004')
    const chips = await screen.findAllByRole('button', { name: /§6\.3/ }, { timeout: 4000 })
    await user1.click(chips[0])
    const echo = await screen.findByTestId('route-echo', {}, { timeout: 4000 })
    expect(echo.textContent).toContain('/app/regulatory/frameworks?framework=MBA%2FAML%2F2023')
    expect(echo.textContent).toContain('requirement=')
  })

  it('gates the workflow: deputy can review, read-only cannot (§19)', async () => {
    const first = renderPage(DEPUTY, '/app/regulatory/obligations?obligation=OBL-2026-002')
    expect(await screen.findByRole('button', { name: /Record review/i }, { timeout: 4000 })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Edit applicability/i })).toBeEnabled()

    // Cleanup only runs between tests — unmount before the second render.
    first.unmount()
    renderPage(READ_ONLY, '/app/regulatory/obligations?obligation=OBL-2026-002')
    expect(await screen.findByRole('button', { name: /Record review/i }, { timeout: 4000 })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Edit applicability/i })).toBeDisabled()
  })

  it('deputy records a review — toast, refreshed cycle and a change-history entry', async () => {
    const user1 = userEvent.setup()
    renderPage(DEPUTY, '/app/regulatory/obligations?obligation=OBL-2026-002')
    await user1.click(await screen.findByRole('button', { name: /Record review/i }, { timeout: 4000 }))

    expect(await screen.findByText(/Record review — OBL-2026-002/i, {}, { timeout: 4000 })).toBeInTheDocument()
    await user1.type(screen.getByLabelText(/Review note/i), 'Buffer restoration verified against SUB-2026-0144 (test).')
    // Both the header action and the modal footer are "Record review" — the
    // modal renders last in the DOM.
    const saveButtons = screen.getAllByRole('button', { name: 'Record review' })
    await user1.click(saveButtons[saveButtons.length - 1])

    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()

    await user1.click(screen.getByRole('tab', { name: /Change history/i }))
    expect(
      (await screen.findAllByText(/Buffer restoration verified against SUB-2026-0144 \(test\)\./i, {}, { timeout: 4000 }))
        .length,
    ).toBeGreaterThan(0)
  })

  it('shows a designed not-found state for an unknown obligation reference', async () => {
    renderPage(DEPUTY, '/app/regulatory/obligations?obligation=OBL-1999-999')
    expect(await screen.findByText('Obligation not found', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to register/i })).toBeInTheDocument()
  })
})
