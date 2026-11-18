import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Bell, CircleExclamationPoint, Info, TriangleExclamationPoint } from 'lucide-react'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { useNotificationStore } from '@/store/notificationStore'
import type { Notification } from '@/types/common'
import { cx } from '@/utils/cx'
import { formatRelativeTime } from '@/utils/datetime'

/**
 * Notification bell (Spec §3.3) + panel (Spec §16): unread count badge,
 * mark read / mark all read, open related record. Mock data only.
 */
function SeverityIcon({ notification }: { notification: Notification }) {
  if (notification.severity === 'critical')
    return <CircleExclamationPoint className="h-4 w-4 text-error" aria-hidden="true" />
  if (notification.severity === 'warning')
    return <TriangleExclamationPoint className="h-4 w-4 text-warning" aria-hidden="true" />
  return <Info className="h-4 w-4 text-primary" aria-hidden="true" />
}

export function NotificationBell() {
  const navigate = useNavigate()
  const notifications = useNotificationStore((s) => s.notifications)
  const loaded = useNotificationStore((s) => s.loaded)
  const refresh = useNotificationStore((s) => s.refresh)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!loaded) void refresh()
  }, [loaded, refresh])

  return (
    <DropdownMenu
      ariaLabel="Notifications"
      semantics="dialog"
      panelClassName="w-96 max-w-[calc(100vw-2rem)]"
      renderTrigger={({ triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-page hover:text-ink"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-semibold text-white"
            >
              {unread}
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div className="flex max-h-[28rem] flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="section-title">Notifications</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unread === 0}
              className="cursor-pointer text-xs font-medium text-primary-surface transition-colors hover:text-primary disabled:cursor-not-allowed disabled:text-ink-tertiary"
            >
              Mark all read
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-ink-secondary">No notifications in this demo session.</p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cx(
                  'flex items-start gap-3 border-b border-line-light px-4 py-3 transition-colors',
                  !n.read && 'bg-tint-blue/40',
                )}
              >
                <span className="mt-0.5 shrink-0">
                  <SeverityIcon notification={n} />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void markRead(n.id)
                    close()
                    if (n.link) navigate(n.link)
                  }}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                  aria-label={`${n.title} — open related record`}
                >
                  <p className={cx('text-xs leading-snug text-ink', !n.read && 'font-semibold')}>{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-secondary">{n.body}</p>
                  <p className="mt-1 text-[10px] text-ink-tertiary">{formatRelativeTime(n.createdAt)}</p>
                </button>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => {
                close()
                navigate('/app/notifications')
              }}
              className="w-full cursor-pointer rounded-md py-2 text-xs font-semibold text-primary transition-colors hover:bg-page"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </DropdownMenu>
  )
}
