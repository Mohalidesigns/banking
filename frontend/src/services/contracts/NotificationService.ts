import type { Notification } from '@/types/common'

/**
 * Notification contract (Spec §16/§18.3). The topbar bell and the
 * notifications page depend on this interface only.
 */
export interface NotificationService {
  list(): Promise<Notification[]>
  unreadCount(): Promise<number>
  markRead(id: string): Promise<Notification[]>
  markUnread(id: string): Promise<Notification[]>
  markAllRead(): Promise<Notification[]>
}
