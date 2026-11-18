import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { ExaminationWorkspacePage } from '@/features/examinations/ExaminationWorkspacePage'
import { findingService } from '@/services/mock/MockFindingService'
import { useSessionStore } from '@/store/sessionStore'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { EXAMINATIONS } from '@/mocks/fixtures/supervision.fixture'
import type { DemoUser } from '@/types/auth'

/**
 * Fieldwork workspace (Spec §7.4) end-to-end in RTL: select a procedure in
 * the tree, record a Fail result with exception details, save the draft
 * (dirty-state tracked), then raise a finding from the exception through the
 * five-Cs modal and land on the new finding's detail route.
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

const EXM_014 = EXAMINATIONS.find((e) => e.reference === 'EXM-2026-014')!

function RouteEcho() {
  const location = useLocation()
  return <div data-testid="route-echo">{location.pathname}</div>
}

function renderWorkspace() {
  const router = createMemoryRouter(
    [
      { path: '/app/examinations/:examinationId/workspace', Component: ExaminationWorkspacePage },
      { path: '*', Component: RouteEcho },
    ],
    { initialEntries: [`/app/examinations/${EXM_014.id}/workspace`] },
  )
  // ToastHost renders the toast stack the page feedback relies on (it lives
  // in the app layouts in production).
  return render(
    <>
      <RouterProvider router={router} />
      <ToastHost />
    </>,
  )
}

const OPTS = { timeout: 6000 }

describe('Examination workspace fieldwork flow', () => {
  beforeEach(() => {
    useSessionStore.setState({ currentUser: DIRECTOR, jurisdictions: [], jurisdiction: null })
    localStorage.clear()
    resetAllDemoData()
  })

  it('saves a procedure result draft and raises a finding from the exception', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    // Left panel tree loads with the AML procedures of EXM-2026-014.
    const aml05 = await screen.findByRole('button', { name: /aml-05/i }, OPTS)
    await user.click(aml05)

    // Centre panel shows the selected procedure's test form (AML-05's
    // question text is unique to the centre panel).
    expect(await screen.findByText(/72-hour standard/i, {}, OPTS)).toBeInTheDocument()

    // Record a Fail result with exception details.
    await user.click(screen.getByRole('button', { name: 'Fail' }))
    await user.type(
      screen.getByLabelText(/exception details/i),
      'RTL test: 4 of 15 sampled STR narratives incomplete (demo).',
    )

    // Save draft is enabled once the form is dirty; the header flags unsaved changes.
    const saveDraft = screen.getByRole('button', { name: /save draft/i })
    expect(await screen.findByText(/unsaved changes/i, {}, OPTS)).toBeInTheDocument()
    expect(saveDraft).toBeEnabled()
    await user.click(saveDraft)

    await waitFor(() => {
      expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
    }, OPTS)
    expect((await screen.findAllByText(/draft saved/i, {}, OPTS)).length).toBeGreaterThan(0)

    // Raise a finding from the recorded exception.
    await user.click(screen.getByRole('button', { name: /raise finding/i }))
    const dialog = await screen.findByRole('dialog', {}, OPTS)
    expect(within(dialog).getByText(/raise finding from aml-05 exception/i)).toBeInTheDocument()

    // Five-Cs fields are prefilled from the procedure exception and criteria.
    expect(within(dialog).getByLabelText(/condition \(what was found\)/i)).toHaveValue(
      'RTL test: 4 of 15 sampled STR narratives incomplete (demo).',
    )
    await user.type(within(dialog).getByLabelText(/responsible institution owner/i), 'Grace Mbeki')

    await user.click(within(dialog).getByRole('button', { name: /raise finding/i }))

    // The finding is created through the service and linked to the procedure.
    await waitFor(async () => {
      const list = await findingService.list({ examinationId: EXM_014.id })
      expect(list.some((f) => f.procedureCode === 'AML-05')).toBe(true)
    }, OPTS)

    // The success toast confirms the workflow completed.
    expect(await screen.findByText(/finding raised/i, {}, OPTS)).toBeInTheDocument()

    // Lands on the new finding's detail route (Journey A step 8).
    const echo = await screen.findByTestId('route-echo', {}, OPTS)
    expect(echo).toHaveTextContent(/^\/app\/findings\/.+/)
  }, 30_000)
})
