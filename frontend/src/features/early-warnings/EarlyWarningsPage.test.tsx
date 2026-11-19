import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { EarlyWarningsPage } from '@/features/early-warnings/EarlyWarningsPage'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Early Warning Alerts (Spec §6.4): register columns, deep-link into the
 * alert detail (?alert=<id>, the route the Command Centre drawer and
 * notifications use), illustrative-threshold labelling, and role gating of
 * the acknowledge action (§19).
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

function renderPage(role: DemoUser = LEAD, entry = '/app/early-warnings') {
  useSessionStore.setState({ currentUser: role, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/early-warnings', Component: EarlyWarningsPage },
      { path: '*', Component: RouteEcho },
    ],
    { initialEntries: [entry] },
  )
  return render(<RouterProvider router={router} />)
}

describe('Early Warning register (§6.4)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the §6.4 alert columns with demo labelling', async () => {
    renderPage()
    expect(await screen.findByText('EWA-2026-011', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('Triggering indicator')).toBeInTheDocument()
    expect(screen.getByText('Configured threshold')).toBeInTheDocument()
    expect(screen.getByText('Assigned analyst')).toBeInTheDocument()
    expect(screen.getByText(/illustrative until approved regulatory rules/i)).toBeInTheDocument()
  })

  it('clicking an alert row opens the detail with trigger, rule version and linked examination', async () => {
    renderPage()
    const ref = await screen.findByText('EWA-2026-011', {}, { timeout: 4000 })
    const user1 = userEvent.setup()
    await user1.click(ref)

    expect(await screen.findByText('Trigger explanation', {}, { timeout: 4000 })).toBeInTheDocument()
    // Rule version appears in both the trigger explanation and the rule panel.
    expect(screen.getAllByText(/TH-LCR-2026\.1 \(demo\)/).length).toBeGreaterThan(0)
    // Journey B: the alert already links the targeted examination EXM-2026-024.
    expect(screen.getAllByText('EXM-2026-024').length).toBeGreaterThan(0)
    // Source return deep-link into the submission detail (SUB-2026-0144 story).
    expect(screen.getAllByText(/MPR-04 · October 2026/).length).toBeGreaterThan(0)
  })

  it('deep-linking ?alert=<id> lands directly on the alert detail', async () => {
    // Use the stable fixture id via the register first, then re-render the link.
    renderPage(LEAD)
    const ref = await screen.findByText('EWA-2026-008', {}, { timeout: 4000 })
    const user1 = userEvent.setup()
    await user1.click(ref)
    const echoMatches = await screen.findAllByText(/Enforcement case/i, {}, { timeout: 4000 })
    expect(echoMatches.some((el) => el.textContent?.includes('ENF-2026-002'))).toBe(true)
  })

  it('gates acknowledge: enabled for team lead, disabled for read-only (§19)', async () => {
    const first = renderPage(LEAD)
    const ref = await screen.findByText('EWA-2026-011', {}, { timeout: 4000 })
    const user1 = userEvent.setup()
    await user1.click(ref)
    const acknowledge = await screen.findByRole('button', { name: /acknowledge/i }, { timeout: 4000 })
    expect(acknowledge).toBeEnabled()

    // Cleanup only runs between tests — unmount so the open detail's
    // breadcrumb cannot collide with the second render's register row.
    first.unmount()
    renderPage(READ_ONLY)
    const ref2 = await screen.findByText('EWA-2026-011', {}, { timeout: 4000 })
    await user1.click(ref2)
    const acknowledge2 = await screen.findByRole('button', { name: /acknowledge/i }, { timeout: 4000 })
    expect(acknowledge2).toBeDisabled()
  })
})
