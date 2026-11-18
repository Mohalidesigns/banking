import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Sidebar } from '@/layouts/components/Sidebar'
import { useSessionStore } from '@/store/sessionStore'

function mockMatchMedia(matches: Record<string, boolean>) {
  window.matchMedia = ((query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

const desktop = { '(min-width: 1024px)': true, '(min-width: 768px)': true }
const mobile = { '(min-width: 1024px)': false, '(min-width: 768px)': false }

function renderSidebarAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    useSessionStore.setState({
      sidebarCollapsed: false,
      expandedGroups: {},
      mobileNavOpen: false,
    })
  })

  it('marks the active route with aria-current and the gold active border', () => {
    mockMatchMedia(desktop)
    renderSidebarAt('/app/institutions')

    const active = screen.getByRole('link', { name: 'Institution Registry' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.className).toContain('border-accent')

    const inactive = screen.getByRole('link', { name: 'Branch Network' })
    expect(inactive).not.toHaveAttribute('aria-current')
    expect(inactive.className).not.toContain('border-accent')
  })

  it('collapses and expands a nav group, remembering via the session store', async () => {
    mockMatchMedia(desktop)
    const user = userEvent.setup()
    renderSidebarAt('/app/dashboard')

    expect(screen.getByRole('link', { name: 'Off-Site Surveillance' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /surveillance & risk/i }))
    expect(screen.queryByRole('link', { name: 'Off-Site Surveillance' })).not.toBeInTheDocument()
    expect(useSessionStore.getState().expandedGroups['surveillance']).toBe(false)

    await user.click(screen.getByRole('button', { name: /surveillance & risk/i }))
    expect(screen.getByRole('link', { name: 'Off-Site Surveillance' })).toBeInTheDocument()
  })

  it('renders the 72px icon rail without labels when collapsed', () => {
    mockMatchMedia(desktop)
    useSessionStore.setState({ sidebarCollapsed: true })
    renderSidebarAt('/app/dashboard')

    const aside = screen.getByLabelText('Sidebar')
    expect(aside).toHaveStyle({ width: '72px' })
    // Section labels are hidden in the rail.
    expect(screen.queryByText('Institution Management')).not.toBeInTheDocument()
    // Icon links remain reachable and labelled.
    expect(screen.getByRole('link', { name: 'Institution Registry' })).toBeInTheDocument()
  })

  it('is hidden on mobile until the drawer is opened', async () => {
    mockMatchMedia(mobile)
    renderSidebarAt('/app/dashboard')

    expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument()

    act(() => {
      useSessionStore.getState().setMobileNavOpen(true)
    })

    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Institution Registry' })).toBeInTheDocument()
  })
})
