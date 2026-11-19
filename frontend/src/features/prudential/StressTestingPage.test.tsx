import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { StressTestingPage } from '@/features/prudential/StressTestingPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Stress Testing (Spec §8.4): scenario library with the mandatory
 * illustrative-demo labelling (never official regulatory results), the run
 * register, ?run= deep links into baseline-vs-stressed results, and the
 * reviewer approval workflow with §19 gating (approve-prudential tier).
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
const ANALYST = user('prudential-analyst', 'Fatima Bello', 'FB')

function RouteEcho() {
  const location = useLocation()
  return (
    <div data-testid="route-echo">
      {location.pathname}
      {location.search}
    </div>
  )
}

function renderPage(role: DemoUser = LEAD, entry = '/app/prudential/stress-testing') {
  useSessionStore.setState({ currentUser: role, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/prudential/stress-testing', Component: StressTestingPage },
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

describe('Stress Testing page (§8.4)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the scenario library labelled illustrative — never official results', async () => {
    renderPage()
    expect((await screen.findAllByText('SCN-2026-002', {}, { timeout: 4000 })).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Severe Macro-Financial Shock (demo)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Illustrative demo data').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/never official regulatory stress-test results/i).length,
    ).toBeGreaterThan(0)
    // Seeded runs are registered with their review states.
    expect(screen.getAllByText('RUN-2026-003').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RUN-2026-004').length).toBeGreaterThan(0)
  })

  it('opens scenario assumptions from the library card', async () => {
    renderPage()
    const user1 = userEvent.setup()
    // The reference renders on both the scenario card and the run table row.
    const matches = await screen.findAllByText('SCN-2026-003', {}, { timeout: 4000 })
    const card = matches.find((el) => el.tagName === 'SPAN')!
    await user1.click(card)

    expect(await screen.findByText('Scenario assumptions', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText(/Wholesale funding run-off/).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/not an official regulatory stress-test result/i).length,
    ).toBeGreaterThan(0)
  })

  it('?run= deep link lands on baseline vs stressed results with the Vanguard breach', async () => {
    renderPage(LEAD, '/app/prudential/stress-testing?run=RUN-2026-003')
    expect(
      await screen.findByText('Baseline versus stressed outcomes', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    const vanguardRow = screen.getAllByText('Vanguard Regional Bank')[0].closest('tr')!
    expect(within(vanguardRow as HTMLElement).getByText('Breach')).toBeInTheDocument()
    expect(screen.getAllByText('Sensitivity analysis').length).toBeGreaterThan(0)
  })

  it('gates run approval: disabled for analyst, enabled for team lead (§19)', async () => {
    const first = renderPage(ANALYST, '/app/prudential/stress-testing?run=RUN-2026-004')
    expect(await screen.findByRole('button', { name: 'Approve' }, { timeout: 4000 })).toBeDisabled()

    // Cleanup only runs between tests — unmount before the second render.
    first.unmount()
    renderPage(LEAD, '/app/prudential/stress-testing?run=RUN-2026-004')
    expect(await screen.findByRole('button', { name: 'Approve' }, { timeout: 4000 })).toBeEnabled()
  })

  it('team lead approves the Northstar funding-stress run — saved in prototype session', async () => {
    renderPage(LEAD, '/app/prudential/stress-testing?run=RUN-2026-004')
    const user1 = userEvent.setup()
    await user1.click(await screen.findByRole('button', { name: 'Approve' }, { timeout: 4000 }))

    expect(await screen.findByText('Approve stress run', {}, { timeout: 4000 })).toBeInTheDocument()
    const note = screen.getByLabelText(/Review note/i)
    await user1.type(note, 'Approved for the liquidity follow-up briefing (test note).')
    await user1.click(screen.getByRole('button', { name: 'Approve run' }))

    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()
    // The header status badge flips to Approved (rendered in header + panel).
    expect((await screen.findAllByText('Approved', {}, { timeout: 4000 })).length).toBeGreaterThan(0)
  })
})
