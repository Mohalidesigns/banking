import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { ToastHost } from '@/components/feedback/ToastHost'
import { Sidebar } from '@/layouts/components/Sidebar'
import { Topbar } from '@/layouts/components/Topbar'
import { useSessionStore } from '@/store/sessionStore'
import { useUIStore } from '@/store/uiStore'

/**
 * Regulator application shell (Spec §3.1): sidebar + topbar + content +
 * global toast layer. Requires a demo session; portal identities are routed
 * to their own experience (Spec §15).
 */
export function RegulatorLayout() {
  const location = useLocation()
  const currentUser = useSessionStore((s) => s.currentUser)
  const openSearch = useUIStore((s) => s.openSearch)

  // ⌘K / Ctrl+K opens the global search overlay (Spec §3.4).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openSearch])

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (currentUser.portal) {
    return <Navigate to="/portal/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main-content" className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
        <footer className="border-t border-line px-4 py-3 text-center text-[10px] text-ink-tertiary md:px-8">
          Atheris Reg frontend prototype — fictional demo data only. No action in this environment has
          regulatory effect.
        </footer>
      </div>
      <ToastHost />
    </div>
  )
}
