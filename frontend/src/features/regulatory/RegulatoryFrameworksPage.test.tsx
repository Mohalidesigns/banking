import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { RegulatoryFrameworksPage } from '@/features/regulatory/RegulatoryFrameworksPage'
import { resetAllDemoData } from '@/mocks/repositories/demoDataReset'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Regulatory Frameworks (Spec §10.1): the framework library, the six
 * detail tabs, requirement detail with the story anchors (EXM-2026-014 →
 * FND-2026-101), the AI-extracted-draft distinction with the gated
 * approve flow, and §19 gating of the simulated upload.
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

function renderPage(currentUser: DemoUser = DEPUTY, entry = '/app/regulatory/frameworks') {
  useSessionStore.setState({ currentUser, jurisdictions: [], jurisdiction: null })
  const router = createMemoryRouter(
    [
      { path: '/app/regulatory/frameworks', Component: RegulatoryFrameworksPage },
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

describe('Regulatory Frameworks page (§10.1)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllDemoData()
  })

  it('renders the framework library with demo labelling and status spread', async () => {
    renderPage()
    expect(await screen.findByText('Framework library', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Illustrative demo data').length).toBeGreaterThan(0)
    for (const code of ['MBA/PRU/2024', 'MBA/AML/2023', 'MBA/PSB/2026']) {
      expect(screen.getAllByText(code).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText('Superseded').length).toBeGreaterThan(0) // MBA/PRU/2021
    expect(screen.getAllByText('Under Consultation').length).toBeGreaterThan(0) // MBA/PSB/2026
  })

  it('opens the AML framework with the six detail tabs and the §6.3 story anchors', async () => {
    const user1 = userEvent.setup()
    renderPage(DEPUTY, '/app/regulatory/frameworks?framework=MBA%2FAML%2F2023')

    // All six §10.1 detail tabs are present.
    expect(await screen.findByRole('tab', { name: /Overview/i }, { timeout: 4000 })).toBeInTheDocument()
    for (const tab of ['Requirements', 'Applicability', 'Mappings', 'Documents', 'Version history']) {
      expect(screen.getByRole('tab', { name: new RegExp(tab, 'i') })).toBeInTheDocument()
    }

    // Requirements tab lists §6.3; opening it shows the full §10.1 detail.
    await user1.click(screen.getByRole('tab', { name: /Requirements/i }))
    const refButtons = await screen.findAllByRole('button', { name: '§6.3' }, { timeout: 4000 })
    await user1.click(refButtons[0])

    expect(await screen.findByText('Evidence expected', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByText('Legal / standard source').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Transaction monitoring rules must cover/i).length).toBeGreaterThan(0)
    // Related obligations chip links into the §10.2 register.
    expect(screen.getAllByRole('button', { name: /OBL-2026-004/ }).length).toBeGreaterThan(0)
    // Story anchors carry the live examination; clicking navigates to it.
    const examChip = screen.getAllByRole('button', { name: /EXM-2026-014/ })[0]
    await user1.click(examChip)
    const echo = await screen.findByTestId('route-echo', {}, { timeout: 4000 })
    expect(echo.textContent).toMatch(/^\/app\/examinations\/[0-9a-f-]{36}$/)
  })

  it('keeps AI-extracted drafts visibly separate and lets the deputy approve one', async () => {
    const user1 = userEvent.setup()
    renderPage(DEPUTY, '/app/regulatory/frameworks?framework=MBA%2FPSB%2F2026')
    await user1.click(await screen.findByRole('tab', { name: /Requirements/i }, { timeout: 4000 }))

    // The consultation draft ships machine-extracted requirements.
    expect((await screen.findAllByText('AI-Extracted Draft', {}, { timeout: 4000 })).length).toBeGreaterThan(0)

    const draftButtons = await screen.findAllByRole('button', { name: '§2.3 (draft)' }, { timeout: 4000 })
    await user1.click(draftButtons[0])

    // Prototype honesty: the drawer marks the draft as a Demo AI response.
    expect(await screen.findByText(/Demo AI response — not approved regulatory content/i, {}, { timeout: 4000 })).toBeInTheDocument()

    await user1.click(screen.getByRole('button', { name: /Approve requirement/i }))
    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 4000 })).toBeInTheDocument()
    // The requirement is approved content now (badge in the drawer + table).
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Reviewed and approved in the prototype session/i).length).toBeGreaterThan(0)
  })

  it('gates the simulated upload: enabled for deputy, disabled for read-only (§19)', async () => {
    const first = renderPage(DEPUTY)
    expect(await screen.findByRole('button', { name: /Upload framework/i }, { timeout: 4000 })).toBeEnabled()

    // Cleanup only runs between tests — unmount before the second render.
    first.unmount()
    renderPage(READ_ONLY)
    expect(await screen.findByRole('button', { name: /Upload framework/i }, { timeout: 4000 })).toBeDisabled()
  })

  it('runs the simulated upload with Demo AI extraction end-to-end', async () => {
    const user1 = userEvent.setup()
    renderPage(DEPUTY)
    await user1.click(await screen.findByRole('button', { name: /Upload framework/i }, { timeout: 4000 }))

    expect(await screen.findByText(/Upload framework \(simulated\)/i, {}, { timeout: 4000 })).toBeInTheDocument()
    await user1.type(screen.getByLabelText(/Framework name/i), 'Demo Test Regulation')
    await user1.type(screen.getByLabelText(/Citation code/i), 'MBA/TST/2026')
    fireEvent.change(screen.getByLabelText(/Effective date/i), { target: { value: '2027-01-01' } })
    await user1.type(screen.getByLabelText(/^Description/i), 'Uploaded by the demo test suite.')
    await user1.type(screen.getByLabelText(/Source document name/i), 'MBA-TST-Draft.pdf')

    await user1.click(screen.getByRole('button', { name: /Upload & run Demo AI extraction/i }))

    // Lands on the new framework detail with the AI drafts labelled.
    expect(await screen.findByText('Saved in prototype session', {}, { timeout: 6000 })).toBeInTheDocument()
    expect((await screen.findAllByText(/MBA\/TST\/2026/i, {}, { timeout: 6000 })).length).toBeGreaterThan(0)
    await user1.click(await screen.findByRole('tab', { name: /Requirements/i }, { timeout: 6000 }))
    expect((await screen.findAllByText('AI-Extracted Draft', {}, { timeout: 6000 })).length).toBeGreaterThan(0)
  })

  it('shows a designed not-found state for an unknown framework code', async () => {
    renderPage(DEPUTY, '/app/regulatory/frameworks?framework=MBA%2FNOPE%2F1999')
    expect(await screen.findByText('Framework not found', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to framework library/i })).toBeInTheDocument()
  })
})
