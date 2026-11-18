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
import { DEMO_ROLE_LABELS, type DemoUser } from '@/types/auth'
import { cx } from '@/utils/cx'

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
      if (active) setDemoUsers(users.filter((u) => !u.portal))
    })
    return () => {
      active = false
    }
  }, [])

  if (!currentUser) return null

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
          <div className="border-t border-line py-1">
            <p className="overline px-4 py-1.5">Switch demo role (prototype only)</p>
            {demoUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                role="menuitem"
                disabled={user.id === currentUser.id}
                onClick={() => {
                  void authService.switchDemoRole(user.role).then((result) => {
                    startSession(result)
                    close()
                    toast.info(
                      'Demo role switched',
                      `Now demonstrating ${DEMO_ROLE_LABELS[user.role]} (${user.fullName}). Demo role — not secure authentication.`,
                    )
                  })
                }}
                className={cx(
                  'flex w-full cursor-pointer items-center gap-2.5 px-4 py-1.5 text-left transition-colors hover:bg-gray-100',
                  user.id === currentUser.id && 'cursor-default bg-tint-blue/50 hover:bg-tint-blue/50',
                )}
              >
                <UserAvatar initials={user.initials} name={user.fullName} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-ink">{user.fullName}</span>
                  <span className="block truncate text-[10px] text-ink-secondary">
                    {DEMO_ROLE_LABELS[user.role]}
                  </span>
                </span>
                {user.id === currentUser.id && (
                  <span className="text-[9px] font-semibold tracking-wide text-success uppercase">Active</span>
                )}
              </button>
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
