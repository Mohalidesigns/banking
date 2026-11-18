import type { Notification, NotificationCategory, NotificationSeverity } from '@/types/common'

/**
 * Notification contract (Spec §16/§18.3). The topbar bell and the
 * notifications page depend on this interface only. Extended in Phase 2A
 * with prototype-session mutations (Spec §17.4: local demo state +
 * Reset Demo Data) so module actions can raise in-app notifications.
 */
export interface NotificationService {
  list(): Promise<Notification[]>
  unreadCount(): Promise<number>
  markRead(id: string): Promise<Notification[]>
  markUnread(id: string): Promise<Notification[]>
  markAllRead(): Promise<Notification[]>
  /** Raise a demo notification (prototype session only, never a real push). */
  push(input: {
    category: NotificationCategory
    severity: NotificationSeverity
    title: string
    body: string
    link?: string
  }): Promise<Notification[]>
  /** Restore the initial demo dataset (Spec §17.4 Reset Demo Data). */
  resetDemoData(): Promise<Notification[]>
}
