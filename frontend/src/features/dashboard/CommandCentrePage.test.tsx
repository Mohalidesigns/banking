import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { CommandCentrePage } from '@/features/dashboard/CommandCentrePage'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoUser } from '@/types/auth'

/**
 * Command Centre KPI navigation (Spec §5.2): every KPI card must navigate to
 * the matching filtered list.
 */

const DIRECTOR: DemoUser = {
  id: 'test-director',
  fullName: 'Test Director',
  email: 'test.director@meridia-central.gov',
  initials: 'TD',
  jobTitle: 'Director of Supervision',
  role: 'director-of-supervision',
  jurisdictionIds: [],
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

function renderCommandCentre() {
  const router = createMemoryRouter(
    [
      { path: '/app/dashboard', Component: CommandCentrePage },
      { path: '*', Component: RouteEcho },
    ],
    { initialEntries: ['/app/dashboard'] },
  )
  return render(<RouterProvider router={router} />)
}

const clickKpi = async (label: RegExp) => {
  const kpiLabel = await screen.findByText(label, {}, { timeout: 4000 })
  const card = kpiLabel.closest('[role="button"]')
  expect(card).not.toBeNull()
  const user = userEvent.setup()
  await user.click(card as HTMLElement)
  return screen.getByTestId('route-echo')
}

describe('Command Centre KPI navigation', () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentUser: DIRECTOR,
      jurisdictions: [],
      jurisdiction: null,
    })
    localStorage.clear()
  })

  it('renders the demo-labelled header once data loads', async () => {
    renderCommandCentre()
    expect(await screen.findByText(/demo \/ illustrative figures/i, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText(/reporting date/i)).toBeInTheDocument()
  })

  it('Supervised Institutions KPI navigates to the institution registry', async () => {
    renderCommandCentre()
    const echo = await clickKpi(/^supervised institutions$/i)
    expect(echo).toHaveTextContent('/app/institutions')
  })

  it('High/Critical Risk KPI navigates to the registry filtered to Critical and High', async () => {
    renderCommandCentre()
    const echo = await clickKpi(/high \/ critical risk institutions/i)
    expect(echo).toHaveTextContent('/app/institutions')
    expect(decodeURIComponent(echo.textContent ?? '')).toContain('risk=Critical,High')
  })

  it('Overdue Regulatory Returns KPI navigates to the filtered returns list', async () => {
    renderCommandCentre()
    const echo = await clickKpi(/overdue regulatory returns/i)
    expect(echo).toHaveTextContent('/app/returns')
    expect(echo.textContent).toContain('status=overdue')
  })
})
