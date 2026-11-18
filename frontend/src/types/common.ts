/** Shared data contracts (Spec §18.4). */

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
