import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ChevronDown,
  Keyboard,
  LogOut,
  MonitorSmartphone,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { authService } from '@/services/mock/MockAuthService'
import { useSessionStore } from '@/store/sessionStore'
import { DEMO_ROLE_LABELS, DEMO_ROLE_ORDER, type DemoUser } from '@/types/auth'
import { cx } from '@/utils/cx'

/** One row in the demo role switcher list (Spec §19). */
function RoleSwitchItem({
  user,
  active,
  portal,
  onSwitch,
}: {
  user: DemoUser
  active: boolean
  portal?: boolean
  onSwitch: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={active}
      onClick={onSwitch}
      className={cx(
        'flex w-full cursor-pointer items-center gap-2.5 px-4 py-1.5 text-left transition-colors hover:bg-gray-100',
        active && 'cursor-default bg-tint-blue/50 hover:bg-tint-blue/50',
      )}
    >
      <UserAvatar initials={user.initials} name={user.fullName} size={24} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-ink">{user.fullName}</span>
        <span className="block truncate text-[10px] text-ink-secondary">
          {DEMO_ROLE_LABELS[user.role]}
          {portal && user.portal ? ` · ${user.portal.institutionCode}` : ''}
        </span>
      </span>
      {active && (
        <span className="text-[9px] font-semibold tracking-wide text-success uppercase">Active</span>
      )}
    </button>
  )
}

/**
 * User avatar + dropdown (Spec §3.3). Includes the prototype-only
 * "Switch Demo Role" control, which always carries the
 * "DEMO ROLE — NOT SECURE AUTHENTICATION" indicator (Spec §1.1/§23).
 */
export function UserMenu() {
  const navigate = useNavigate()
  const currentUser = useSessionStore((s) => s.currentUser)
  const startSession = useSessionStore((s) => s.startSession)
  const endSession = useSessionStore((s) => s.endSession)
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([])

  useEffect(() => {
    let active = true
    void authService.listDemoUsers().then((users) => {
      if (active) {
        setDemoUsers(
          [...users].sort(
            (a, b) => DEMO_ROLE_ORDER.indexOf(a.role) - DEMO_ROLE_ORDER.indexOf(b.role),
          ),
        )
      }
    })
    return () => {
      active = false
    }
  }, [])

  if (!currentUser) return null

  const regulatorUsers = demoUsers.filter((u) => !u.portal)
  const institutionUsers = demoUsers.filter((u) => u.portal)

  const switchTo = (user: DemoUser, close: () => void) => {
    void authService.switchDemoRole(user.role).then((result) => {
      startSession(result)
      close()
      navigate(result.user.portal ? '/portal/dashboard' : '/app/dashboard')
      toast.info(
        'Demo role switched',
        `Now demonstrating ${DEMO_ROLE_LABELS[user.role]} (${user.fullName}). Demo role — not secure authentication.`,
      )
    })
  }

  return (
    <DropdownMenu
      ariaLabel="User menu"
      panelClassName="w-80"
      renderTrigger={({ triggerProps, open }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label={`User menu for ${currentUser.fullName}`}
          className={cx(
            'flex cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-page',
            open && 'bg-page',
          )}
        >
          <UserAvatar initials={currentUser.initials} name={currentUser.fullName} />
          <span className="hidden flex-col items-start leading-tight xl:flex">
            <span className="text-xs font-semibold text-ink">{currentUser.fullName}</span>
            <span className="text-[10px] text-ink-secondary">
              {DEMO_ROLE_LABELS[currentUser.role]}
              <span className="ml-1.5 rounded bg-accent/15 px-1 py-px font-semibold tracking-wide text-accent-dark uppercase">
                Demo
              </span>
            </span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-ink-tertiary xl:block" aria-hidden="true" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">{currentUser.fullName}</p>
            <p className="truncate text-xs text-ink-secondary">{currentUser.email}</p>
            <p className="mt-2 rounded bg-accent/10 px-2 py-1 text-[9px] leading-snug font-semibold tracking-wide text-accent-dark uppercase">
              Demo role — not secure authentication
            </p>
          </div>
          <DropdownMenuItem
            icon={<UserRound />}
            onSelect={() => {
              close()
              navigate('/app/profile')
            }}
          >
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<SlidersHorizontal />}
            onSelect={() => {
              close()
              toast.info('My Preferences', 'Demo preferences panel — saved in prototype session only.')
            }}
          >
            My Preferences
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<MonitorSmartphone />}
            onSelect={() => {
              close()
              toast.info('Security & Sessions', 'Prototype view only — this demo has no real sessions or credentials.')
            }}
          >
            Security & Sessions
          </DropdownMenuItem>
          <div className="max-h-80 overflow-y-auto border-t border-line py-1">
            <p className="overline px-4 py-1.5">Regulator demo roles (prototype only)</p>
            {regulatorUsers.map((user) => (
              <RoleSwitchItem
                key={user.id}
                user={user}
                active={user.id === currentUser.id}
                onSwitch={() => switchTo(user, close)}
              />
            ))}
            <p className="overline mt-1 px-4 py-1.5">
              Institution roles — open the portal layout
            </p>
            {institutionUsers.map((user) => (
              <RoleSwitchItem
                key={user.id}
                user={user}
                active={user.id === currentUser.id}
                onSwitch={() => switchTo(user, close)}
                portal
              />
            ))}
          </div>
          <div className="border-t border-line pt-1">
            <DropdownMenuItem
              danger
              icon={<LogOut />}
              onSelect={() => {
                close()
                void authService.signOut().then(() => {
                  endSession()
                  navigate('/login')
                  toast.info('Signed out', 'Demo session ended. No real credentials were used.')
                })
              }}
            >
              Sign Out
            </DropdownMenuItem>
          </div>
          <p className="flex items-center gap-1.5 px-4 py-2 text-[10px] text-ink-tertiary">
            <Keyboard className="h-3 w-3" aria-hidden="true" />
            Press ⌘K for global search
          </p>
        </div>
      )}
    </DropdownMenu>
  )
}
