import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { PrudentialIndicatorsPage } from '@/features/prudential/PrudentialIndicatorsPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Prudential Indicators (Spec §8.5): configurable catalogue, indicator
 * detail with formula / source return fields / validation rules / threshold
 * history, the story-anchored readings (Northstar LCR → EWA-2026-011), and
 * §19 gating of the threshold editor (manage-indicator-thresholds tier).
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

function renderPage(role: DemoUser = LEAD, entry = '/app/prudential/indicators') {
  useSessionStore.setState({ currentUser: role, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/prudential/indicators', Component: PrudentialIndicatorsPage },
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

describe('Prudential Indicators page (§8.5)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the configurable catalogue with demo labelling', async () => {
    renderPage()
    expect(await screen.findByText('Indicator catalogue', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Illustrative demo data').length).toBeGreaterThan(0)
    // The nine core indicators ship in the catalogue.
    for (const code of ['CAR', 'LCR', 'NSFR', 'NPL', 'PC', 'DC', 'FXOP', 'LEV', 'CET1R']) {
      expect(screen.getAllByText(code).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText(/Thresholds \(demo\)/i).length).toBeGreaterThan(0)
  })

  it('opens the LCR detail with formula, source return fields and the Northstar story anchor', async () => {
    renderPage(LEAD, '/app/prudential/indicators?indicator=LCR')
    expect(
      await screen.findByText('Definition & formula', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/HQLA ÷ 30-day net cash outflows × 100/).length).toBeGreaterThan(0)
    // Source return fields feeding the indicator (Spec §8.5).
    expect(screen.getAllByText('MPR-04.hqla').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Threshold history').length).toBeGreaterThan(0)
    // Northstar Q3 2026 LCR reading carries the EWA-2026-011 anchor.
    expect(screen.getAllByText('104.2').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/EWA-2026-011/).length).toBeGreaterThan(0)
  })

  it('gates the threshold editor: enabled for team lead, disabled for analyst (§19)', async () => {
    const first = renderPage(LEAD, '/app/prudential/indicators?indicator=LCR')
    expect(await screen.findByRole('button', { name: /Edit thresholds/i }, { timeout: 4000 })).toBeEnabled()

    // Cleanup only runs between tests — unmount before the second render.
    first.unmount()
    renderPage(ANALYST, '/app/prudential/indicators?indicator=LCR')
    expect(await screen.findByRole('button', { name: /Edit thresholds/i }, { timeout: 4000 })).toBeDisabled()
  })

  it('team lead edits thresholds — rule version bumps and history records the change', async () => {
    renderPage(LEAD, '/app/prudential/indicators?indicator=LCR')
    const user1 = userEvent.setup()
    await user1.click(await screen.findByRole('button', { name: /Edit thresholds/i }, { timeout: 4000 }))

    expect(await screen.findByText(/Edit thresholds — LCR/i, {}, { timeout: 4000 })).toBeInTheDocument()
    const amber = screen.getByLabelText(/Amber level/i)
    await user1.clear(amber)
    await user1.type(amber, '118')
    const note = screen.getByLabelText(/Change note/i)
    await user1.type(note, 'Amber watch level raised to 118 for the demo (test note).')
    await user1.click(screen.getByRole('button', { name: 'Save thresholds' }))

    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()
    // Rule version bumped and the history entry shows the new note.
    expect(screen.getAllByText(/TH-LCR-2026\.2 \(demo\)/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/raised to 118/i).length).toBeGreaterThan(0)
  })
})
