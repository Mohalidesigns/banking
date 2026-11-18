import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { useSessionStore } from '@/store/sessionStore'

function renderAtLogin() {
  const router = createMemoryRouter(
    [
      { path: '/login', Component: LoginPage },
      {
        path: '/app/dashboard',
        Component: () => <h1>Command Centre stub</h1>,
      },
    ],
    { initialEntries: ['/login'] },
  )
  render(<RouterProvider router={router} />)
}

describe('LoginPage sign-in flow', () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentUser: null,
      jurisdictions: [],
      jurisdiction: null,
    })
    localStorage.clear()
  })

  it('signs in with demo credentials and redirects to the dashboard', async () => {
    const user = userEvent.setup()
    renderAtLogin()

    await user.type(screen.getByLabelText(/email address/i), 'amara.osei@meridia-central.gov')
    await user.type(screen.getByLabelText(/^password/i), 'demo1234')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /command centre stub/i })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )

    const state = useSessionStore.getState()
    expect(state.currentUser?.fullName).toBe('Amara Osei')
    expect(state.jurisdictions.length).toBeGreaterThan(0)
  })

  it('shows inline validation errors for missing fields', async () => {
    const user = userEvent.setup()
    renderAtLogin()

    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(useSessionStore.getState().currentUser).toBeNull()
  })

  it('labels the prototype nature of the demo sign-in', () => {
    renderAtLogin()
    expect(
      screen.getByText(/demo role — not secure authentication/i),
    ).toBeInTheDocument()
  })
})
