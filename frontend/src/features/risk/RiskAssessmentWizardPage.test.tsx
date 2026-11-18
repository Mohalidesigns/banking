import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { RiskAssessmentWizardPage } from '@/features/risk/RiskAssessmentWizardPage'
import { useSessionStore } from '@/store/sessionStore'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import type { DemoUser } from '@/types/auth'

/**
 * Risk assessment wizard (Spec §6.2): step navigation with the 8-step
 * progress indicator, per-step validation, and submit-for-approval creating
 * an assessment through the RiskAssessmentService contract.
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
  return <div data-testid="route-echo">{location.pathname}</div>
}

function renderWizard() {
  const router = createMemoryRouter(
    [
      { path: '/app/risk-assessments/new', Component: RiskAssessmentWizardPage },
      { path: '*', Component: RouteEcho },
    ],
    { initialEntries: ['/app/risk-assessments/new'] },
  )
  return render(<RouterProvider router={router} />)
}

const OPTS = { timeout: 5000 }

describe('Risk assessment wizard', () => {
  beforeEach(() => {
    useSessionStore.setState({ currentUser: DIRECTOR, jurisdictions: [], jurisdiction: null })
    localStorage.clear()
    resetAllDemoData()
    window.scrollTo = () => {}
  })

  it('blocks Next on step 1 until institution and due date are provided', async () => {
    const user = userEvent.setup()
    renderWizard()

    const next = await screen.findByRole('button', { name: /next/i }, OPTS)
    expect(next).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(/select the institution/i)

    const instSelect = screen.getByLabelText(/^institution/i) as HTMLSelectElement
    // First option is the placeholder; pick the first real demo institution.
    await user.selectOptions(instSelect, instSelect.options[1].value)
    await user.type(screen.getByLabelText(/review due date/i), '2027-06-30')

    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
  })

  it('walks all 8 steps and submits for approval, creating an assessment', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Step 1 — institution & period
    expect(await screen.findByText(/step 1 of 8 — institution & period/i, {}, OPTS)).toBeInTheDocument()
    const instSelect = screen.getByLabelText(/^institution/i) as HTMLSelectElement
    await user.selectOptions(instSelect, instSelect.options[1].value)
    await user.type(screen.getByLabelText(/review due date/i), '2027-06-30')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 2 — approved methodology (first approved preselected)
    expect(await screen.findByText(/step 2 of 8 — methodology/i, {}, OPTS)).toBeInTheDocument()
    expect(screen.getByText(/how the demo scoring works/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 3 — categories (all preselected)
    expect(await screen.findByText(/step 3 of 8 — risk categories/i, {}, OPTS)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 4 — inherent risk scores (1–5 pickers per category)
    expect(await screen.findByText(/step 4 of 8 — inherent risk & evidence/i, {}, OPTS)).toBeInTheDocument()
    const inherentGroups = screen.getAllByRole('group', { name: /inherent risk score/i })
    expect(inherentGroups.length).toBeGreaterThanOrEqual(6)
    for (const group of inherentGroups) {
      await user.click(within(group).getByRole('button', { name: '4' }))
    }
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 5 — control effectiveness
    expect(await screen.findByText(/step 5 of 8 — control effectiveness/i, {}, OPTS)).toBeInTheDocument()
    const controlGroups = screen.getAllByRole('group', { name: /control effectiveness score/i })
    for (const group of controlGroups) {
      await user.click(within(group).getByRole('button', { name: '2' }))
    }
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 6 — residual determination (computed, demo methodology note shown)
    expect(await screen.findByText(/step 6 of 8 — residual risk/i, {}, OPTS)).toBeInTheDocument()
    expect(screen.getByText(/residual \(computed\)/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 7 — supervisory judgement
    expect(await screen.findByText(/step 7 of 8 — judgement & overrides/i, {}, OPTS)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText(/supervisory judgement and recommended intensity rationale/i),
      'Demo judgement: elevated inherent risk offset by strong controls; recommend Enhanced supervision.',
    )
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Step 8 — review & submit
    expect(await screen.findByText(/step 8 of 8 — review & submit/i, {}, OPTS)).toBeInTheDocument()
    expect(screen.getByText(/recommended intensity/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /submit for approval/i }))

    // Navigates to the created assessment's detail route.
    const echo = await screen.findByTestId('route-echo', {}, OPTS)
    expect(echo).toHaveTextContent(/^\/app\/risk-assessments\/.+/)
  }, 30_000)
})
