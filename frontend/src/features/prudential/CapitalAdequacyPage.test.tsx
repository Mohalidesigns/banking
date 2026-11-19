import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { CapitalAdequacyPage } from '@/features/prudential/CapitalAdequacyPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Capital Adequacy (Spec §8.1): KPI cards and the Vanguard story
 * (SUB-2026-0143 rejected, CAR 6.4%), the submission detail modal
 * (formula, rule version, breakdown), the accept workflow mutation and
 * §19 role gating of the decision actions.
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

const LEAD = user('supervisory-team-lead', 'Amara Osei', 'AO')
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

function renderPage(role: DemoUser = LEAD, entry = '/app/prudential/capital') {
  useSessionStore.setState({ currentUser: role, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/prudential/capital', Component: CapitalAdequacyPage },
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

describe('Capital Adequacy page (§8.1)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the §8.1 KPI cards with demo labelling and the Vanguard story row', async () => {
    renderPage()
    expect(await screen.findByText('Regulatory capital', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('Risk-weighted assets')).toBeInTheDocument()
    expect(screen.getByText('Portfolio capital adequacy ratio')).toBeInTheDocument()
    expect(screen.getByText('Buffer / shortfall')).toBeInTheDocument()
    expect(screen.getAllByText('Illustrative demo data').length).toBeGreaterThan(0)
    // The rejected Vanguard October return keeps its SUB reference (chip + table).
    expect(screen.getAllByText('SUB-2026-0143').length).toBeGreaterThan(0)
    expect(screen.getAllByText('6.4').length).toBeGreaterThan(0)
  })

  it('opens the submission detail with formula, breakdown and rule version', async () => {
    renderPage()
    const user1 = userEvent.setup()
    // The period label also renders in the filter <select>; click the table cell.
    const matches = await screen.findAllByText('November 2026', {}, { timeout: 4000 })
    const cell = matches.find((el) => el.closest('td'))!
    await user1.click(cell)

    expect(await screen.findByText('Definition & formula', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('CAR = (CET1 + AT1 + Tier 2) ÷ RWA × 100')).toBeInTheDocument()
    // Rule version appears in both the detail grid and the submissions table.
    expect(screen.getAllByText(/TH-CAR-2026\.1 \(demo\)/).length).toBeGreaterThan(0)
    expect(screen.getByText('Calculation breakdown')).toBeInTheDocument()
  })

  it('gates the accept decision: enabled for team lead, disabled for read-only (§19)', async () => {
    const first = renderPage(LEAD)
    await screen.findAllByText('November 2026', {}, { timeout: 4000 })
    const accept = await screen.findByRole('button', { name: 'Accept' })
    expect(accept).toBeEnabled()

    // Cleanup only runs between tests — unmount so both trees never coexist.
    first.unmount()
    renderPage(READ_ONLY)
    await screen.findAllByText('November 2026', {}, { timeout: 4000 })
    const accept2 = await screen.findByRole('button', { name: 'Accept' })
    expect(accept2).toBeDisabled()
  })

  it('lead accepts the Vanguard resubmission — saved in prototype session', async () => {
    renderPage(LEAD)
    const user1 = userEvent.setup()
    await screen.findAllByText('November 2026', {}, { timeout: 4000 })
    await user1.click(screen.getByRole('button', { name: 'Accept' }))

    expect(await screen.findByText('Accept capital submission', {}, { timeout: 4000 })).toBeInTheDocument()
    await user1.click(screen.getByRole('button', { name: 'Accept submission' }))

    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()
    await waitFor(() => {
      // The accepted row no longer offers the decision buttons.
      expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    })
  })
})
