import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { RegulatoryCorrespondencePage } from '@/features/regulatory/RegulatoryCorrespondencePage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Regulatory Correspondence (Spec §10.3): the register, the letter preview
 * with story relations, the compose → review → approve → send-demo
 * workflow (dispatch is SIMULATED — prototype honesty assertions), and
 * §19 gating (deputy approves, legal manages but never approves,
 * read-only reads).
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

const DEPUTY = user('deputy-director', 'Tunde Bakare', 'TB')
const LEGAL = user('legal-enforcement-officer', 'Zainab Lawal', 'ZL')
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

function renderPage(currentUser: DemoUser = DEPUTY, entry = '/app/regulatory/correspondence') {
  useSessionStore.setState({ currentUser, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/regulatory/correspondence', Component: RegulatoryCorrespondencePage },
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

describe('Regulatory Correspondence page (§10.3)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the register with demo labelling and workflow queues', async () => {
    renderPage()
    expect(await screen.findByText('Correspondence register', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Illustrative demo data').length).toBeGreaterThan(0)
    for (const ref of ['COR-2026-001', 'COR-2026-002', 'COR-2026-005']) {
      expect(screen.getAllByText(ref).length).toBeGreaterThan(0)
    }
    // Queue badges: COR-2026-008 is In Review; two incoming threads await a response.
    expect(screen.getAllByText(/awaiting approval/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/response required/i).length).toBeGreaterThan(0)
  })

  it('opens the Northstar LCR letter with story relations and simulated-dispatch honesty', async () => {
    renderPage(DEPUTY, '/app/regulatory/correspondence?correspondence=COR-2026-002')

    // Letter preview renders the fictional authority letterhead and body.
    expect((await screen.findAllByText('Meridia Banking Authority', {}, { timeout: 4000 })).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/liquidity buffer restoration plan within fifteen/i).length).toBeGreaterThan(0)
    // Sent letters state the prototype-honesty rule instead of offering actions.
    expect(screen.getAllByText(/no real communication left the prototype/i).length).toBeGreaterThan(0)
    // The EWA-2026-011 relation is a live link into the early-warning register.
    expect(screen.getAllByRole('button', { name: /EWA-2026-011/ }).length).toBeGreaterThan(0)
    // Thread history records the simulated dispatch.
    expect(screen.getAllByText('Sent (demo)').length).toBeGreaterThan(0)
  })

  it('deputy runs submit → approve → send-demo on the Crestline cyber draft', async () => {
    const user1 = userEvent.setup()
    renderPage(DEPUTY, '/app/regulatory/correspondence?correspondence=COR-2026-005')

    await user1.click(await screen.findByRole('button', { name: /Submit for review/i }, { timeout: 4000 }))
    expect(await screen.findByText('Submitted for review', {}, { timeout: 4000 })).toBeInTheDocument()

    // Approve opens the note modal; the modal footer button renders last.
    const approveBtn = await screen.findByRole('button', { name: 'Approve' })
    await waitFor(() => expect(approveBtn).toBeEnabled())
    await user1.click(approveBtn)
    expect(await screen.findByText(/Approve — COR-2026-005/i, {}, { timeout: 4000 })).toBeInTheDocument()
    await user1.type(screen.getByLabelText(/Approval note/i), 'Wording verified against EXM-2026-005 (test).')
    let approveButtons = screen.getAllByRole('button', { name: 'Approve' })
    await user1.click(approveButtons[approveButtons.length - 1])
    expect(await screen.findByText('Approved (demo)', {}, { timeout: 4000 })).toBeInTheDocument()

    // Send is a simulation with an explicit confirmation dialog.
    const sendBtn = await screen.findByRole('button', { name: /Send \(demo\)/i })
    await waitFor(() => expect(sendBtn).toBeEnabled())
    await user1.click(sendBtn)
    expect(await screen.findByText(/Send COR-2026-005 \(simulated\)\?/i, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText(/NO real communication is sent/i).length).toBeGreaterThan(0)
    await user1.click(screen.getByRole('button', { name: /Confirm simulated send/i }))

    expect(await screen.findByText('Demo action completed', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText(/SIMULATED dispatch — no real communication/i).length).toBeGreaterThan(0)
    // Status moved to Sent and the thread shows the simulated dispatch event.
    expect(screen.getAllByText('Sent (demo)').length).toBeGreaterThan(0)
  })

  it('gates the workflow: legal can request changes but never approve; read-only cannot submit (§19)', async () => {
    const first = renderPage(LEGAL, '/app/regulatory/correspondence?correspondence=COR-2026-008')
    expect(await screen.findByRole('button', { name: /Request changes/i }, { timeout: 4000 })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()

    // Cleanup only runs between tests — unmount before the second render.
    first.unmount()
    renderPage(READ_ONLY, '/app/regulatory/correspondence?correspondence=COR-2026-005')
    expect(await screen.findByRole('button', { name: /Submit for review/i }, { timeout: 4000 })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Edit draft/i })).toBeDisabled()
  })

  it('composes a draft with related-record picker and simulated attachments', async () => {
    const user1 = userEvent.setup()
    renderPage(LEGAL)
    await user1.click(await screen.findByRole('button', { name: /Compose \(demo\)/i }, { timeout: 4000 }))
    expect(await screen.findByText(/Compose correspondence \(demo\)/i, {}, { timeout: 4000 })).toBeInTheDocument()

    // Pick the Meridian story institution — candidates load from its anchors.
    const select = screen.getByLabelText(/^Institution/) as HTMLSelectElement
    const meridianOption = [...select.options].find((o) => o.textContent?.includes('MCB-001'))!
    await user1.selectOptions(select, meridianOption.value)
    expect(await screen.findByRole('checkbox', { name: /EXM-2026-014/ }, { timeout: 4000 })).toBeInTheDocument()

    await user1.type(screen.getByLabelText(/^Subject/), 'Follow-up on remediation milestones (test)')
    await user1.type(screen.getByLabelText(/Letter body/i), 'Fictional demo body composed by the test suite.')
    await user1.click(screen.getByRole('checkbox', { name: /EXM-2026-014/ }))
    await user1.type(screen.getByLabelText(/Attachment file name/i), 'milestone-annex-demo.pdf')
    await user1.click(screen.getByRole('button', { name: 'Add' }))

    await user1.click(screen.getByRole('button', { name: /Create draft/i }))
    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()
    // Lands on the new draft's detail with the relation and attachment kept.
    expect((await screen.findAllByText(/COR-2026-011/i, {}, { timeout: 6000 })).length).toBeGreaterThan(0)
    expect(await screen.findByRole('button', { name: /EXM-2026-014/ }, { timeout: 6000 })).toBeInTheDocument()
    expect((await screen.findAllByText('milestone-annex-demo.pdf', {}, { timeout: 6000 })).length).toBeGreaterThan(0)
  })

  it('logs and closes the response on an incoming Meridian submission', async () => {
    const user1 = userEvent.setup()
    renderPage(DEPUTY, '/app/regulatory/correspondence?correspondence=COR-2026-006')

    await user1.click(await screen.findByRole('button', { name: /Log response & close/i }, { timeout: 4000 }))
    expect(await screen.findByText(/Log response — COR-2026-006/i, {}, { timeout: 4000 })).toBeInTheDocument()
    await user1.type(screen.getByLabelText(/^Note/), 'Milestones validated against the remediation register (test).')
    const saveButtons = screen.getAllByRole('button', { name: /Log response & close/i })
    await user1.click(saveButtons[saveButtons.length - 1])

    expect(await screen.findByText('Response logged', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText(/Response assessed and thread closed/i).length).toBeGreaterThan(0)
  })

  it('shows a designed not-found state for an unknown reference', async () => {
    renderPage(DEPUTY, '/app/regulatory/correspondence?correspondence=COR-1999-999')
    expect(await screen.findByText('Correspondence not found', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to register/i })).toBeInTheDocument()
  })
})
