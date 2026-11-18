import type { WorkItem, WorkItemStatus } from '@/types/supervision'

export type WorkDueFilter = 'all' | 'overdue' | 'today' | 'upcoming'

export interface WorkQueueQuery {
  type?: string
  priority?: string
  due?: WorkDueFilter
  status?: string
  institutionId?: string
  search?: string
}

export interface WorkQueueCounts {
  total: number
  open: number
  inProgress: number
  dueToday: number
  overdue: number
  upcoming: number
}

export interface WorkActor {
  userId: string
  userName: string
}

/**
 * My Work contract (Spec §5.3). Mutations are local prototype state
 * (Spec §17.4) — the mock service never claims real persistence.
 */
export interface WorkQueueService {
  list(query: WorkQueueQuery, actor: WorkActor): Promise<WorkItem[]>
  counts(actor: WorkActor): Promise<WorkQueueCounts>
  setStatus(id: string, status: WorkItemStatus, actor: WorkActor): Promise<WorkItem>
  reassign(id: string, assigneeId: string, assigneeName: string, actor: WorkActor): Promise<WorkItem>
  addNote(id: string, text: string, actor: WorkActor): Promise<WorkItem>
  /** Assignable colleagues for the reassign demo action. */
  listColleagues(): Promise<Array<{ id: string; fullName: string; jobTitle: string }>>
}
