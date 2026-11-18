/**
 * Mock My Work queue repository (Spec §5.3 / §17.4). Status, reassignment
 * and note mutations are local prototype state; reset restores the demo set.
 */
import { WORK_ITEMS } from '@/mocks/fixtures/supervision.fixture'
import type { WorkItem, WorkItemStatus } from '@/types/supervision'

const records: WorkItem[] = WORK_ITEMS.map((w) => ({ ...w, notes: [...w.notes] }))

const nextId = (): string => `wi-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`

export const workQueueRepository = {
  list(): WorkItem[] {
    return records.map((w) => ({ ...w, notes: [...w.notes] }))
  },

  /**
   * Prototype convenience: the demo queue always belongs to the current demo
   * user. If a switched role has no items, unfinished items are shown as
   * assigned to them (documented demo behaviour, Spec §19 role scenarios).
   */
  listFor(assigneeId: string): WorkItem[] {
    const own = records.filter((w) => w.assignedToId === assigneeId)
    if (own.length > 0) return own.map((w) => ({ ...w, notes: [...w.notes] }))
    return records.map((w) => ({ ...w, notes: [...w.notes] }))
  },

  setStatus(id: string, status: WorkItemStatus): WorkItem | undefined {
    const item = records.find((w) => w.id === id)
    if (!item) return undefined
    item.status = status
    return { ...item, notes: [...item.notes] }
  },

  reassign(id: string, assigneeId: string, assigneeName: string): WorkItem | undefined {
    const item = records.find((w) => w.id === id)
    if (!item) return undefined
    item.assignedToId = assigneeId
    item.assignedToName = assigneeName
    item.notes.push({
      id: nextId(),
      author: 'Prototype session',
      at: new Date().toISOString(),
      text: `Reassigned to ${assigneeName} (demo action).`,
    })
    return { ...item, notes: [...item.notes] }
  },

  addNote(id: string, author: string, text: string): WorkItem | undefined {
    const item = records.find((w) => w.id === id)
    if (!item) return undefined
    item.notes.push({ id: nextId(), author, at: new Date().toISOString(), text })
    return { ...item, notes: [...item.notes] }
  },

  reset(): void {
    records.length = 0
    WORK_ITEMS.forEach((w) => records.push({ ...w, notes: [...w.notes] }))
  },
}
