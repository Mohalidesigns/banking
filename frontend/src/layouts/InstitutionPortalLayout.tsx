import { useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { LogOut, Menu, X } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { ToastHost } from '@/components/feedback/ToastHost'
import { toast } from '@/components/feedback/toastStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { PORTAL_NAV } from '@/config/navigation'
import { authService } from '@/services/mock/MockAuthService'
import { useSessionStore } from '@/store/sessionStore'
import { cx } from '@/utils/cx'

/**
 * Institution portal shell (Spec §15) — a minimal Phase 1 skeleton that is
 * visually distinct from the regulator workspace: light surface, navy text,
 * gold accents, portal-only navigation. Pages land in Phase 6.
 */
export function InstitutionPortalLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useSessionStore((s) => s.currentUser)
  const endSession = useSessionStore((s) => s.endSession)
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!currentUser) {
    return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />
  }
  if (!currentUser.portal) {
    return <Navigate to="/app/dashboard" replace />
  }

  const institution = currentUser.portal

  const signOut = () => {
    void authService.signOut().then(() => {
      endSession()
      navigate('/portal/login')
      toast.info('Signed out', 'Demo portal session ended.')
    })
  }

  const nav = (
    <nav aria-label="Portal" className="flex h-full flex-col gap-0.5 overflow-y-auto p-3">
      {PORTAL_NAV.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-[13px] transition-all duration-200',
                isActive
                  ? 'border-accent bg-tint-blue font-medium text-primary'
                  : 'border-transparent text-ink-secondary hover:bg-page hover:text-ink',
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-page">
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-card md:flex"
        aria-label="Portal sidebar"
      >
        <div className="border-b border-line p-4">
          <BrandLogo variant="light" />
          <p className="mt-3 rounded bg-accent/10 px-2 py-1 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
            Institution Portal
          </p>
          <p className="mt-2 text-xs font-semibold text-ink">{institution.institutionName}</p>
          <p className="font-mono text-[10px] text-ink-secondary">{institution.institutionCode} · Fictional demo institution</p>
        </div>
        {nav}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Portal navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="animate-fade-in absolute inset-0 cursor-default bg-gray-500/75"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-slide-in-left absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-line p-4">
              <BrandLogo variant="light" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="cursor-pointer rounded p-1 text-ink-secondary hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-4 border-b border-line bg-card px-4 py-2 shadow-subtle md:px-8"
          role="banner"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-secondary hover:bg-page hover:text-ink md:hidden"
            >
              <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-base leading-tight font-bold text-primary">
                {institution.institutionName}
              </h1>
              <p className="text-[11px] text-ink-secondary">
                Institution Portal — demo access, not secure authentication
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserAvatar initials={currentUser.initials} name={currentUser.fullName} size={32} />
            <span className="hidden text-xs font-medium text-ink sm:block">{currentUser.fullName}</span>
            <button
              type="button"
              onClick={signOut}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-tint-red"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </header>
        <main id="main-content" className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
