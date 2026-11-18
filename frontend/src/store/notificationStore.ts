import { create } from 'zustand'
import { notificationService } from '@/services/mock/MockNotificationService'
import type { Notification } from '@/types/common'

/**
 * Live notification state for the shell (topbar bell + notifications page).
 * All mutations go through the NotificationService contract — never the
 * repository or fixtures directly (Spec §18.3).
 */
interface NotificationState {
  notifications: Notification[]
  loaded: boolean
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markUnread: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  loaded: false,
  loading: false,

  refresh: async () => {
    if (get().loading) return
    set({ loading: true })
    const notifications = await notificationService.list()
    set({ notifications, loaded: true, loading: false })
  },

  markRead: async (id) => {
    const notifications = await notificationService.markRead(id)
    set({ notifications })
  },

  markUnread: async (id) => {
    const notifications = await notificationService.markUnread(id)
    set({ notifications })
  },

  markAllRead: async () => {
    const notifications = await notificationService.markAllRead()
    set({ notifications })
  },

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
