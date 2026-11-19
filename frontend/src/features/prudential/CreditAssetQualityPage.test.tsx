import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { CreditAssetQualityPage } from '@/features/prudential/CreditAssetQualityPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Credit & Asset Quality (Spec §8.2): the seven §8.2 tabs, the Meridian
 * two-large-exposures story (EWA-2026-013), the Vanguard related-party
 * breaches from EXM-2026-012, and the loan sample review workflow with
 * §19 role gating (record-fieldwork tier).
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

function renderPage(role: DemoUser = EXAMINER, entry = '/app/prudential/credit') {
  useSessionStore.setState({ currentUser: role, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/prudential/credit', Component: CreditAssetQualityPage },
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

describe('Credit & Asset Quality page (§8.2)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the §8.2 KPI cards, sector table and the Meridian story borrower', async () => {
    renderPage()
    expect(await screen.findByText('Gross loans', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('NPL balance')).toBeInTheDocument()
    expect(screen.getByText('NPL ratio')).toBeInTheDocument()
    expect(screen.getByText('Provision coverage')).toBeInTheDocument()
    expect(screen.getByText('Concentrated exposures')).toBeInTheDocument()
    expect(screen.getAllByText('Illustrative demo data').length).toBeGreaterThan(0)
    // Two large exposures under watch drive the Meridian amber NPL (EWA-2026-013).
    expect(await screen.findByText('Harmattan Energy Ltd', {}, { timeout: 4000 })).toBeInTheDocument()
    // Sahel appears in both the top-borrower and restructured tables.
    expect(screen.getAllByText('Sahel Agro-Allied Plc').length).toBeGreaterThan(0)
  })

  it('shows the Vanguard related-party breaches on the Large Exposures tab', async () => {
    renderPage()
    const user1 = userEvent.setup()
    const tab = await screen.findByRole('tab', { name: /Large Exposures/ }, { timeout: 4000 })
    await user1.click(tab)

    expect(await screen.findByText('Vanguard Continental Holdings Ltd', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Breach').length).toBeGreaterThan(0)
    // Single-obligor limit is documented on the table title (demo rule).
    expect(screen.getAllByText(/single-obligor limit/i).length).toBeGreaterThan(0)
  })

  it('gates the loan-sample conclusion drawer: enabled for examiner, disabled for read-only (§19)', async () => {
    const first = renderPage(EXAMINER)
    const user1 = userEvent.setup()
    const tab = await screen.findByRole('tab', { name: /Credit Examination/ }, { timeout: 4000 })
    await user1.click(tab)

    const sample = await screen.findByText('LNG-2026-013', {}, { timeout: 4000 })
    await user1.click(sample)
    const record = await screen.findByRole('button', { name: /Record conclusion/i }, { timeout: 4000 })
    expect(record).toBeEnabled()

    // Cleanup only runs between tests — unmount so the open drawer cannot
    // collide with the second render.
    first.unmount()
    renderPage(READ_ONLY)
    const tab2 = await screen.findByRole('tab', { name: /Credit Examination/ }, { timeout: 4000 })
    await user1.click(tab2)
    const sample2 = await screen.findByText('LNG-2026-013', {}, { timeout: 4000 })
    await user1.click(sample2)
    const record2 = await screen.findByRole('button', { name: /Record conclusion/i }, { timeout: 4000 })
    expect(record2).toBeDisabled()
    // Permission-denied guidance is designed, not deferred.
    expect(
      screen.getAllByText(/cannot record examiner conclusions/i).length,
    ).toBeGreaterThan(0)
  })

  it('examiner concludes a pending sample — saved in prototype session', async () => {
    renderPage(EXAMINER)
    const user1 = userEvent.setup()
    const tab = await screen.findByRole('tab', { name: /Credit Examination/ }, { timeout: 4000 })
    await user1.click(tab)

    const sample = await screen.findByText('LNG-2026-016', {}, { timeout: 4000 })
    await user1.click(sample)
    expect(await screen.findByText('Facility & borrower', {}, { timeout: 4000 })).toBeInTheDocument()

    const note = screen.getByLabelText(/Conclusion note/i)
    await user1.type(note, 'Classification appropriate; collateral coverage adequate (test note).')
    await user1.click(screen.getByRole('button', { name: /Record conclusion/i }))

    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()
    // The row now shows the recorded conclusion badge.
    const row = (await screen.findAllByText('LNG-2026-016', {}, { timeout: 4000 }))[0].closest('tr')!
    expect(within(row as HTMLElement).getByText('Satisfactory')).toBeInTheDocument()
  })
})
