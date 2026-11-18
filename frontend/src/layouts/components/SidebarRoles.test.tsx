import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Sidebar } from '@/layouts/components/Sidebar'
import { useSessionStore } from '@/store/sessionStore'
import type { DemoRole, DemoUser } from '@/types/auth'

/**
 * Role switcher navigation visibility (Spec §19): the sidebar must honour
 * the mock permission profile of the current demo role.
 */

function mockMatchMediaDesktop() {
  window.matchMedia = ((query: string) => ({
    matches: query === '(min-width: 1024px)' || query === '(min-width: 768px)',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

const userWithRole = (role: DemoRole): DemoUser => ({
  id: `test-${role}`,
  fullName: 'Test Persona',
  email: 'test.persona@meridia-central.gov',
  initials: 'TP',
  jobTitle: role,
  role,
  jurisdictionIds: [],
})

function renderSidebar(role: DemoRole) {
  useSessionStore.setState({
    currentUser: userWithRole(role),
    jurisdictions: [],
    jurisdiction: null,
    sidebarCollapsed: false,
    expandedGroups: {},
    mobileNavOpen: false,
  })
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('role-based sidebar navigation (Spec §19)', () => {
  beforeEach(() => {
    mockMatchMediaDesktop()
    localStorage.clear()
  })

  it('shows the full supervisory tree to the Director of Supervision', () => {
    renderSidebar('director-of-supervision')
    expect(screen.getByRole('link', { name: 'Institution Registry' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Examination Register' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'User Management' })).toBeInTheDocument()
  })

  it('limits an Examiner to Overview and Examination Operations', () => {
    renderSidebar('examiner')
    expect(screen.getByRole('link', { name: 'Supervisory Command Centre' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Work' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Examination Register' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Institution Registry' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'User Management' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Enforcement Cases' })).not.toBeInTheDocument()
  })

  it('gives the Read-Only Supervisor sight of supervisory sections but not administration', () => {
    renderSidebar('read-only-supervisor')
    expect(screen.getByRole('link', { name: 'Institution Registry' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'User Management' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'System Settings' })).not.toBeInTheDocument()
  })

  it('always carries the persistent demo-role indicator', () => {
    renderSidebar('prudential-analyst')
    expect(screen.getByText(/demo role — not secure authentication/i)).toBeInTheDocument()
  })
})
