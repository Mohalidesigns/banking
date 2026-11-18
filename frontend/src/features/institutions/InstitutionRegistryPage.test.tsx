import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { InstitutionRegistryPage } from '@/features/institutions/InstitutionRegistryPage'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoUser } from '@/types/auth'

/**
 * Institution Registry (Spec §5.4): URL-driven risk filter and column
 * sorting over the demo dataset.
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

function renderRegistry(initialEntry = '/app/institutions') {
  const router = createMemoryRouter(
    [{ path: '/app/institutions', Component: InstitutionRegistryPage }],
    { initialEntries: [initialEntry] },
  )
  return render(<RouterProvider router={router} />)
}

const bodyRows = () => screen.getAllByRole('row').slice(1)

describe('Institution Registry', () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentUser: DIRECTOR,
      jurisdictions: [],
      jurisdiction: null,
    })
    localStorage.clear()
  })

  it('lists the demo institutions', async () => {
    renderRegistry()
    expect(await screen.findByText('Meridian Commercial Bank', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('Vanguard Regional Bank')).toBeInTheDocument()
    expect(screen.getByText('8 records · demo data')).toBeInTheDocument()
  })

  it('honours the risk filter from the URL (Command Centre KPI navigation)', async () => {
    renderRegistry('/app/institutions?risk=Critical,High')
    expect(await screen.findByText('Vanguard Regional Bank', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('Meridian Commercial Bank')).toBeInTheDocument()
    expect(screen.queryByText('Unity Non-Interest Bank')).not.toBeInTheDocument()
    expect(screen.getByText('2 records · demo data')).toBeInTheDocument()
  })

  it('filters by category through the toolbar select', async () => {
    const user = userEvent.setup()
    renderRegistry()
    await screen.findByText('Meridian Commercial Bank', {}, { timeout: 4000 })

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'Payment Service Bank')

    expect(await screen.findByText('Crestline Payment Bank', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.queryByText('Meridian Commercial Bank')).not.toBeInTheDocument()
  })

  it('sorts by open findings ascending then descending', async () => {
    const user = userEvent.setup()
    renderRegistry()
    await screen.findByText('Meridian Commercial Bank', {}, { timeout: 4000 })

    const sortButton = screen.getByRole('button', { name: /open findings/i })

    // First click: descending (TanStack default) — Vanguard (6 findings) first.
    await user.click(sortButton)
    expect(within(bodyRows()[0] as HTMLElement).getByText('Vanguard Regional Bank')).toBeInTheDocument()

    // Second click: ascending — zero-finding institutions come first.
    await user.click(sortButton)
    expect(
      within(bodyRows()[0] as HTMLElement).getByText(/aurora savings|sentinel custody/i),
    ).toBeInTheDocument()
  })
})
