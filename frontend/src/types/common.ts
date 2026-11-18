/** Shared data contracts (Spec §18.4). */
import type { DemoRole } from '@/types/auth'

/** Who is performing a workflow mutation — drives demo role gating (§19). */
export interface ActorContext {
  actorId: string
  actorName: string
  actorRole: DemoRole
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PageRequest {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

/** Risk rating scale used across the prototype (DS §8.7). */
export type RiskRating = 'Critical' | 'High' | 'Medium' | 'Low'

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'

/** Notification categories per Spec §16. */
export type NotificationCategory =
  | 'task-assigned'
  | 'review-required'
  | 'approval-required'
  | 'return-deadline'
  | 'information-request-deadline'
  | 'early-warning'
  | 'corrective-action-overdue'
  | 'system'

export type NotificationSeverity = 'info' | 'warning' | 'critical'

export interface Notification {
  /** UUID-shaped id */
  id: string
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  body: string
  /** ISO 8601 */
  createdAt: string
  read: boolean
  /** Optional in-app route to the related record. */
  link?: string
}
