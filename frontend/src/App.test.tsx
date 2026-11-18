import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '@/features/auth/LoginPage'

describe('router smoke', () => {
  it('renders the regulator sign-in page at /login', () => {
    const router = createMemoryRouter([{ path: '/login', Component: LoginPage }], {
      initialEntries: ['/login'],
    })
    render(<RouterProvider router={router} />)
    expect(
      screen.getByRole('heading', { name: /sign in to atheris reg/i }),
    ).toBeInTheDocument()
  })
})
