import { notificationRepository } from '@/mocks/repositories/notificationRepository'
import type { NotificationService } from '@/services/contracts/NotificationService'

const LATENCY_MS = 120

const latency = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))

export class MockNotificationService implements NotificationService {
  async list() {
    await latency()
    return notificationRepository.list()
  }

  async unreadCount() {
    await latency()
    return notificationRepository.list().filter((n) => !n.read).length
  }

  async markRead(id: string) {
    await latency()
    notificationRepository.markRead(id)
    return notificationRepository.list()
  }

  async markUnread(id: string) {
    await latency()
    notificationRepository.markUnread(id)
    return notificationRepository.list()
  }

  async markAllRead() {
    await latency()
    notificationRepository.markAllRead()
    return notificationRepository.list()
  }

  async push(input: Parameters<NotificationService['push']>[0]) {
    await latency()
    notificationRepository.push(input)
    return notificationRepository.list()
  }

  async resetDemoData() {
    await latency()
    notificationRepository.reset()
    return notificationRepository.list()
  }
}

export const notificationService: NotificationService = new MockNotificationService()
