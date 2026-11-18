import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'
import { ChevronDown, ShieldAlert } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { REGULATOR_NAV, type NavItem, type NavSection } from '@/config/navigation'
import { useIsDesktop, useIsTabletOrUp } from '@/hooks/useMediaQuery'
import { useSessionStore } from '@/store/sessionStore'
import { cx } from '@/utils/cx'

/**
 * Regulator sidebar per Spec §3.2 and DS §8.1:
 * - 250px navy sidebar on desktop (72px collapsed icon rail).
 * - Icon rail forced on tablet (768–1023).
 * - Overlay drawer below 768px.
 * - Active item: 3px gold left border, white text on translucent white.
 * - Group collapse state remembered for the prototype session.
 */

function NavItemLink({ item, rail, onNavigate }: { item: NavItem; rail: boolean; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <li>
      <NavLink
        to={item.path}
        onClick={onNavigate}
        aria-label={item.label}
        title={rail ? item.label : undefined}
        className={({ isActive }) =>
          cx(
            'group relative flex items-center gap-3 border-l-[3px] text-[13px] transition-all duration-200 ease-in-out',
            'text-white/70 hover:bg-white/5 hover:text-white',
            isActive && 'border-accent bg-white/10 text-white',
            !isActive && 'border-transparent',
            rail
              ? 'mx-auto h-10 w-10 justify-center rounded-lg px-0'
              : 'rounded-r-lg py-2.5 pr-3 pl-3.5',
          )
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        {!rail && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {!rail && typeof item.count === 'number' && (
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {item.count}
          </span>
        )}
        {rail && typeof item.count === 'number' && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent"
          />
        )}
        {rail && (
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-primary-dark px-2 py-1 text-xs font-medium text-white shadow-elevated group-hover:block"
          >
            {item.label}
            {typeof item.count === 'number' ? ` (${item.count})` : ''}
          </span>
        )}
      </NavLink>
    </li>
  )
}

function SidebarSection({ section, rail, onNavigate }: { section: NavSection; rail: boolean; onNavigate: () => void }) {
  const expanded = useSessionStore((s) => s.expandedGroups[section.id] ?? true)
  const toggleGroup = useSessionStore((s) => s.toggleGroup)

  if (rail) {
    return (
      <div className="border-t border-sidebar-divider px-2 py-2 first:border-t-0">
        <ul className="flex flex-col gap-1">
          {section.items.map((item) => (
            <NavItemLink key={item.path} item={item} rail onNavigate={onNavigate} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="px-2">
      <button
        type="button"
        onClick={() => toggleGroup(section.id)}
        aria-expanded={expanded}
        className="nav-section-label flex w-full cursor-pointer items-center justify-between px-3 py-2 transition-colors hover:text-white/60"
      >
        <span>{section.label}</span>
        <ChevronDown
          className={cx('h-3.5 w-3.5 transition-transform duration-200', !expanded && '-rotate-90')}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <ul className="mb-2 flex flex-col gap-0.5">
          {section.items.map((item) => (
            <NavItemLink key={item.path} item={item} rail={false} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </div>
  )
}

function SidebarContent({ rail, onNavigate }: { rail: boolean; onNavigate: () => void }) {
  return (
    <div className="flex h-full flex-col bg-primary">
      <div className={cx('border-b border-sidebar-divider', rail ? 'p-3' : 'p-5')}>
        {rail ? (
          <div className="flex justify-center">
            <BrandLogo iconOnly />
          </div>
        ) : (
          <BrandLogo />
        )}
      </div>
      <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto py-2">
        {REGULATOR_NAV.map((section) => (
          <SidebarSection key={section.id} section={section} rail={rail} onNavigate={onNavigate} />
        ))}
      </nav>
      {!rail && (
        <div className="border-t border-sidebar-divider p-4">
          <p className="flex items-start gap-2 rounded-lg bg-accent/10 p-2.5 text-[9px] leading-snug font-semibold tracking-wide text-accent uppercase">
            <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Demo role — not secure authentication
          </p>
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const isDesktop = useIsDesktop()
  const isTabletOrUp = useIsTabletOrUp()
  const collapsed = useSessionStore((s) => s.sidebarCollapsed)
  const mobileNavOpen = useSessionStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useSessionStore((s) => s.setMobileNavOpen)
  const location = useLocation()

  const isMobile = !isTabletOrUp
  const rail = !isDesktop // tablet and below force the 72px icon rail

  // Close the drawer on navigation.
  useEffect(() => {
    setMobileNavOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Escape closes the mobile drawer (Spec §17.3).
  useEffect(() => {
    if (!isMobile || !mobileNavOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMobile, mobileNavOpen, setMobileNavOpen])

  if (isMobile) {
    if (!mobileNavOpen) return null
    return (
      <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation">
        <button
          type="button"
          aria-label="Close navigation"
          className="animate-fade-in absolute inset-0 cursor-default bg-gray-500/75"
          onClick={() => setMobileNavOpen(false)}
        />
        <div
          className="animate-slide-in-left absolute inset-y-0 left-0 w-[250px] shadow-2xl"
          style={{ width: 250 }}
        >
          <SidebarContent rail={false} onNavigate={() => setMobileNavOpen(false)} />
        </div>
      </div>
    )
  }

  return (
    <aside
      className="sticky top-0 h-screen shrink-0 transition-[width] duration-200 ease-in-out"
      style={{ width: rail || collapsed ? 72 : 250 }}
      aria-label="Sidebar"
    >
      <SidebarContent rail={rail || collapsed} onNavigate={() => {}} />
    </aside>
  )
}
