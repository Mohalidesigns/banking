import { STAFF } from '@/mocks/fixtures/people.fixture'
import { workQueueRepository } from '@/mocks/repositories/workQueueRepository'
import type {
  WorkActor,
  WorkQueueCounts,
  WorkQueueQuery,
  WorkQueueService,
} from '@/services/contracts/WorkQueueService'
import type { WorkItem, WorkItemStatus } from '@/types/supervision'

const LATENCY_MS = 130
const latency = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))

const todayIso = (): string => new Date().toISOString().slice(0, 10)

export class MockWorkQueueService implements WorkQueueService {
  async list(query: WorkQueueQuery, actor: WorkActor): Promise<WorkItem[]> {
    await latency()
    const today = todayIso()
    const { type, priority, due = 'all', status, institutionId, search = '' } = query
    const q = search.trim().toLowerCase()
    return workQueueRepository
      .listFor(actor.userId)
      .filter((w) => {
        if (type && w.type !== type) return false
        if (priority && w.priority !== priority) return false
        if (status && w.status !== status) return false
        if (institutionId && w.institutionId !== institutionId) return false
        if (q && !`${w.title} ${w.relatedRef ?? ''}`.toLowerCase().includes(q)) return false
        if (due === 'overdue' && !(w.dueDate < today && w.status !== 'Completed')) return false
        if (due === 'today' && !(w.dueDate === today && w.status !== 'Completed')) return false
        if (due === 'upcoming' && !(w.dueDate > today && w.status !== 'Completed')) return false
        return true
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }

  async counts(actor: WorkActor): Promise<WorkQueueCounts> {
    await latency()
    const today = todayIso()
    const items = workQueueRepository.listFor(actor.userId)
    const unfinished = items.filter((w) => w.status !== 'Completed')
    return {
      total: items.length,
      open: items.filter((w) => w.status === 'Open').length,
      inProgress: items.filter((w) => w.status === 'In Progress').length,
      overdue: unfinished.filter((w) => w.dueDate < today).length,
      dueToday: unfinished.filter((w) => w.dueDate === today).length,
      upcoming: unfinished.filter((w) => w.dueDate > today).length,
    }
  }

  async setStatus(id: string, status: WorkItemStatus, _actor: WorkActor): Promise<WorkItem> {
    await latency()
    const updated = workQueueRepository.setStatus(id, status)
    if (!updated) throw new Error(`Work item ${id} not found in the demo queue.`)
    return updated
  }

  async reassign(
    id: string,
    assigneeId: string,
    assigneeName: string,
    _actor: WorkActor,
  ): Promise<WorkItem> {
    await latency()
    const updated = workQueueRepository.reassign(id, assigneeId, assigneeName)
    if (!updated) throw new Error(`Work item ${id} not found in the demo queue.`)
    return updated
  }

  async addNote(id: string, text: string, actor: WorkActor): Promise<WorkItem> {
    await latency()
    const updated = workQueueRepository.addNote(id, actor.userName, text)
    if (!updated) throw new Error(`Work item ${id} not found in the demo queue.`)
    return updated
  }

  async listColleagues() {
    await latency()
    return STAFF.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      jobTitle: s.jobTitle,
    }))
  }
}

export const workQueueService: WorkQueueService = new MockWorkQueueService()
