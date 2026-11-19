import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ReturnsDashboardPage } from '@/features/returns/ReturnsDashboardPage'
import { ReturnSubmissionDetailPage } from '@/features/returns/ReturnSubmissionDetailPage'
import { STORY } from '@/mocks/fixtures/storyRefs'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Returns dashboard (Spec §11.1) and submission detail (§11.3) page flows:
 * KPI cards filter the register, register rows deep-link to the submission
 * detail, the detail renders the seven §11.3 tabs with the story data, and
 * review decisions are gated by role (§19).
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

function renderDashboard(role: DemoUser = LEAD) {
  useSessionStore.setState({ currentUser: role, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/returns', Component: ReturnsDashboardPage },
      { path: '/app/returns/:submissionId', Component: ReturnSubmissionDetailPage },
      { path: '*', Component: RouteEcho },
    ],
    { initialEntries: ['/app/returns'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('Returns dashboard (§11.1)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the six KPI cards with demo labelling once data loads', async () => {
    renderDashboard()
    expect(await screen.findByText('Expected submissions', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('Awaiting review')).toBeInTheDocument()
    expect(screen.getByText('Rejected / returned')).toBeInTheDocument()
    expect(screen.getAllByText(/illustrative demo data/i).length).toBeGreaterThan(0)
  })

  it('the Late KPI filters the register to overdue submissions', async () => {
    renderDashboard()
    const kpi = await screen.findByText('Late', {}, { timeout: 4000 })
    const card = kpi.closest('[role="button"]')
    const user1 = userEvent.setup()
    await user1.click(card as HTMLElement)

    // Both seeded overdue submissions remain visible; a passed return does not.
    expect(await screen.findByText('SUB-2026-0141', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.queryByText('SUB-2026-0142')).not.toBeInTheDocument()
  })

  it('searching the register and clicking a row navigates to the submission detail', async () => {
    renderDashboard()
    const search = await screen.findByLabelText('Search submissions', {}, { timeout: 4000 })
    const user1 = userEvent.setup()
    await user1.type(search, 'SUB-2026-0144')

    const ref = await screen.findByText('SUB-2026-0144', {}, { timeout: 4000 })
    await user1.click(ref)

    // The detail page renders the story submission (Northstar MPR-04, LCR warnings).
    expect(await screen.findByRole('tab', { name: /submission overview/i }, { timeout: 4000 })).toBeInTheDocument()
    // Rendered both in the breadcrumb and the detail header.
    expect(screen.getAllByText('SUB-2026-0144').length).toBeGreaterThan(0)
  })
})

describe('Return submission detail (§11.3)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const renderDetail = (role: DemoUser) => {
    useSessionStore.setState({ currentUser: role, jurisdictions: [], jurisdiction: null })
    const router = createMemoryRouter(
      [
        { path: '/app/returns', Component: ReturnsDashboardPage },
        { path: '/app/returns/:submissionId', Component: ReturnSubmissionDetailPage },
        { path: '*', Component: RouteEcho },
      ],
      { initialEntries: [`/app/returns/${STORY.northstarLiquiditySubmissionId}`] },
    )
    return render(<RouterProvider router={router} />)
  }

  it('renders the seven §11.3 tabs and the story LCR value on Submitted Data', async () => {
    renderDetail(LEAD)
    for (const tab of ['Submission Overview', 'Submitted Data', 'Validation Results', 'Reconciliation', 'Review Notes', 'Version History', 'Activity']) {
      expect(await screen.findByRole('tab', { name: new RegExp(tab) }, { timeout: 4000 })).toBeInTheDocument()
    }

    const user1 = userEvent.setup()
    await user1.click(screen.getByRole('tab', { name: /submitted data/i }))
    // Northstar MPR-04 October 2026 — LCR 104.2 (the EWA-2026-011 story value)
    expect(await screen.findByText('104.2', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText(/Liquidity Coverage Ratio/i)).toBeInTheDocument()
  })

  it('shows the demo validation warnings for the story submission', async () => {
    renderDetail(LEAD)
    const user1 = userEvent.setup()
    await user1.click(await screen.findByRole('tab', { name: /validation results/i }, { timeout: 4000 }))
    expect((await screen.findAllByText(/demo rule engine/i, {}, { timeout: 4000 })).length).toBeGreaterThan(0)
    expect((await screen.findAllByText(/104.2/, {}, { timeout: 4000 })).length).toBeGreaterThan(0)
  })

  it('gates the review decision: analyst disabled, team lead enabled (§19)', async () => {
    renderDetail(ANALYST)
    const decide = await screen.findByRole('button', { name: /review decision/i }, { timeout: 4000 })
    expect(decide).toBeDisabled()
  })

  it('allows the team lead to open the decision modal', async () => {
    renderDetail(LEAD)
    const decide = await screen.findByRole('button', { name: /review decision/i }, { timeout: 4000 })
    expect(decide).toBeEnabled()
    const user1 = userEvent.setup()
    await user1.click(decide)
    expect(await screen.findByText('Analyst review decision (demo)', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Accepted' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Returned for Correction' })).toBeInTheDocument()
  })
})
