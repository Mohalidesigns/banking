import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { LiquidityTreasuryPage } from '@/features/prudential/LiquidityTreasuryPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Liquidity & Treasury (Spec §8.3): KPI cards, the Northstar LCR story
 * exception (SUB-2026-0144 → EXC-2026-011 → EWA-2026-011) on the Exceptions
 * tab, the treasury examination workspace drawer and §19 gating of the
 * examiner-result workflow (record-fieldwork tier).
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

const EXAMINER = user('examiner', 'Samuel Ike', 'SI')
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

function renderPage(role: DemoUser = EXAMINER, entry = '/app/prudential/liquidity') {
  useSessionStore.setState({ currentUser: role, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/prudential/liquidity', Component: LiquidityTreasuryPage },
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

describe('Liquidity & Treasury page (§8.3)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the §8.3 KPI cards with demo labelling', async () => {
    renderPage()
    expect(await screen.findByText('Liquidity position (HQLA)', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('Liquidity coverage ratio')).toBeInTheDocument()
    expect(screen.getByText('Net stable funding ratio')).toBeInTheDocument()
    expect(screen.getAllByText('Deposit concentration').length).toBeGreaterThan(0)
    expect(screen.getByText('FX open position')).toBeInTheDocument()
    expect(screen.getAllByText('Illustrative demo data').length).toBeGreaterThan(0)
  })

  it('surfaces the Northstar LCR exception with SUB/EWA anchors on the Exceptions tab', async () => {
    renderPage()
    const user1 = userEvent.setup()
    const tab = await screen.findByRole('tab', { name: /Exceptions/ }, { timeout: 4000 })
    await user1.click(tab)

    expect(await screen.findByText('EXC-2026-011', {}, { timeout: 4000 })).toBeInTheDocument()
    // Source return + alert anchors are deep links into returns / early warnings.
    expect(screen.getAllByText(/SUB-2026-0144/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/EWA-2026-011/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/104\.2/).length).toBeGreaterThan(0)
  })

  it('shows the Vanguard beyond-mandate failed FX forward in the treasury workspace', async () => {
    renderPage()
    const user1 = userEvent.setup()
    const tab = await screen.findByRole('tab', { name: /Treasury Operations/ }, { timeout: 4000 })
    await user1.click(tab)

    expect(await screen.findByText('TRX-2026-029', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Escalate').length).toBeGreaterThan(0)
  })

  it('gates the treasury examiner result: enabled for examiner, disabled for read-only (§19)', async () => {
    const first = renderPage(EXAMINER)
    const user1 = userEvent.setup()
    let tab = await screen.findByRole('tab', { name: /Treasury Operations/ }, { timeout: 4000 })
    await user1.click(tab)
    const examine = await screen.findAllByRole('button', { name: /^Examine$/ }, { timeout: 4000 })
    await user1.click(examine[0])
    const record = await screen.findByRole('button', { name: /Record result/i }, { timeout: 4000 })
    expect(record).toBeEnabled()

    first.unmount()
    renderPage(READ_ONLY)
    tab = await screen.findByRole('tab', { name: /Treasury Operations/ }, { timeout: 4000 })
    await user1.click(tab)
    const examine2 = await screen.findAllByRole('button', { name: /^Examine$/ }, { timeout: 4000 })
    await user1.click(examine2[0])
    const record2 = await screen.findByRole('button', { name: /Record result/i }, { timeout: 4000 })
    expect(record2).toBeDisabled()
    expect(screen.getAllByText(/cannot record examiner results/i).length).toBeGreaterThan(0)
  })

  it('records a treasury examiner result — saved in prototype session', async () => {
    renderPage(EXAMINER)
    const user1 = userEvent.setup()
    const tab = await screen.findByRole('tab', { name: /Treasury Operations/ }, { timeout: 4000 })
    await user1.click(tab)

    const examine = await screen.findAllByRole('button', { name: /^Examine$/ }, { timeout: 4000 })
    await user1.click(examine[0])
    expect(await screen.findByText('Transaction', {}, { timeout: 4000 })).toBeInTheDocument()

    const note = screen.getByLabelText(/Examiner note/i)
    await user1.type(note, 'Dealings within mandate; settlement evidenced (test note).')
    await user1.click(screen.getByRole('button', { name: /Record result/i }))

    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()
  })
})
