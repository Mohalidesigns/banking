import { useMatches } from 'react-router'
import { Menu, PanelLeft } from 'lucide-react'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/navigation/Breadcrumbs'
import { getRouteHandle } from '@/app/handle'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { HelpMenu } from '@/layouts/components/HelpMenu'
import { JurisdictionSelector } from '@/layouts/components/JurisdictionSelector'
import { NotificationBell } from '@/layouts/components/NotificationBell'
import { SearchTrigger } from '@/layouts/components/SearchTrigger'
import { UserMenu } from '@/layouts/components/UserMenu'
import { useSessionStore } from '@/store/sessionStore'

/**
 * Topbar per Spec §3.3 / DS §8.2: white, ~56px, subtle shadow, border-b.
 * Left: sidebar toggle + page title & breadcrumb. Right: search, jurisdiction
 * selector, help, notification bell, user menu (20px gap).
 */
export function Topbar() {
  const matches = useMatches()
  const isDesktop = useIsDesktop()
  const toggleSidebar = useSessionStore((s) => s.toggleSidebar)
  const setMobileNavOpen = useSessionStore((s) => s.setMobileNavOpen)

  const crumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/app/dashboard' }]
  for (const match of matches) {
    const handle = getRouteHandle(match)
    if (handle.breadcrumb) crumbs.push({ label: handle.breadcrumb, path: match.pathname })
  }
  const title = crumbs.length > 1 ? crumbs[crumbs.length - 1].label : 'Supervisory Command Centre'

  return (
    <header
      className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-5 border-b border-line bg-card px-4 py-2 shadow-subtle md:px-8"
      role="banner"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => (isDesktop ? toggleSidebar() : setMobileNavOpen(true))}
          aria-label={isDesktop ? 'Toggle sidebar' : 'Open navigation'}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-page hover:text-ink"
        >
          {isDesktop ? (
            <PanelLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl leading-tight font-bold text-primary">{title}</h1>
          <Breadcrumbs items={crumbs} className="mt-0.5" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-5">
        <SearchTrigger />
        <JurisdictionSelector />
        <HelpMenu />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
