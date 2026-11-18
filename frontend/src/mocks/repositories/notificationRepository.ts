/**
 * Mock notification repository (Spec §18.3). Read state is mutable in-memory
 * for the prototype session; a backend implementation replaces the service
 * that reads this repository.
 */
import { NOTIFICATIONS } from '@/mocks/fixtures/notifications.fixture'
import type { Notification } from '@/types/common'

const records: Notification[] = NOTIFICATIONS.map((n) => ({ ...n }))

export const notificationRepository = {
  list(): Notification[] {
    return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  markRead(id: string): void {
    const record = records.find((n) => n.id === id)
    if (record) record.read = true
  },

  markUnread(id: string): void {
    const record = records.find((n) => n.id === id)
    if (record) record.read = false
  },

  markAllRead(): void {
    records.forEach((n) => {
      n.read = true
    })
  },

  /** Raise a demo notification (prototype session only). */
  push(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const created: Notification = {
      ...notification,
      id: `ntf-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`,
      createdAt: new Date().toISOString(),
      read: false,
    }
    records.unshift(created)
    return created
  },

  /** Prototype-only: restore the initial demo dataset. */
  reset(): void {
    records.length = 0
    NOTIFICATIONS.forEach((n) => records.push({ ...n }))
  },
}
