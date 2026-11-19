import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck,
  FileSearch,
  FileSpreadsheet,
  FolderSearch,
  Mail,
  MessageSquarePlus,
  Play,
  Repeat,
  Search,
  TriangleExclamationPoint,
  UserRoundCog,
} from 'lucide-react'
import { toast } from '@/components/feedback/toastStore'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { Select, TextArea, TextInput } from '@/components/forms/FormControls'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { workQueueService } from '@/services/mock/MockWorkQueueService'
import type { WorkQueueQuery } from '@/services/contracts/WorkQueueService'
import { useSessionStore } from '@/store/sessionStore'
import type { Institution } from '@/types/institution'
import { WORK_ITEM_TYPE_LABELS, type WorkItem, type WorkItemType } from '@/types/supervision'
import { cx } from '@/utils/cx'
import { formatDate, formatRelativeTime } from '@/utils/datetime'

/**
 * My Work (Spec §5.3) — personal work queue with the eight item types,
 * due-today/upcoming/overdue sections, filters and local-state actions
 * (open, in progress, complete, reassign, add note). Actions are demo-only
 * and respect the current demo role's permission profile (Spec §19).
 */

const TYPE_ICONS: Record<WorkItemType, typeof ClipboardList> = {
  examination: ClipboardList,
  procedure: FolderSearch,
  'evidence-review': FileSearch,
  'finding-review': TriangleExclamationPoint,
  'management-response': Mail,
  'report-approval': FileCheck,
  'corrective-action': Repeat,
  'information-request': Briefcase,
  'return-validation': FileSpreadsheet,
}

const TYPE_OPTIONS = (Object.keys(WORK_ITEM_TYPE_LABELS) as WorkItemType[]).map((t) => ({
  value: t,
  label: WORK_ITEM_TYPE_LABELS[t],
}))

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'].map((p) => ({ value: p, label: p }))
const DUE_OPTIONS = [
  { value: 'all', label: 'All due dates' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'upcoming', label: 'Upcoming' },
]
const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed'].map((s) => ({ value: s, label: s }))

const todayIso = () => new Date().toISOString().slice(0, 10)

export function MyWorkPage() {
  const navigate = useNavigate()
  const currentUser = useSessionStore((s) => s.currentUser)
  const actor = useMemo(
    () => ({ userId: currentUser?.id ?? '', userName: currentUser?.fullName ?? 'Demo user' }),
    [currentUser],
  )
  const canManage = currentUser ? can(currentUser.role, 'manage-work-queue') : false
  const canReassign = currentUser ? can(currentUser.role, 'reassign-work') : false

  const [items, setItems] = useState<WorkItem[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [colleagues, setColleagues] = useState<Array<{ id: string; fullName: string; jobTitle: string }>>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState<WorkQueueQuery>({ due: 'all' })
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null)
  const [noteText, setNoteText] = useState('')
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignTo, setReassignTo] = useState('')

  const instName = useCallback(
    (id: string) => institutions.find((i) => i.id === id)?.tradingName ?? 'Unknown institution',
    [institutions],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const [queue, instPage, people] = await Promise.all([
        workQueueService.list(query, actor),
        institutionService.list({ page: 1, pageSize: 100 }),
        workQueueService.listColleagues(),
      ])
      setItems(queue)
      setInstitutions(instPage.items)
      setColleagues(people)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [query, actor])

  useEffect(() => {
    void load()
  }, [load])

  const applyAction = async (fn: () => Promise<WorkItem>, successTitle: string) => {
    const updated = await fn()
    setItems((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
    setActiveItem((prev) => (prev && prev.id === updated.id ? updated : prev))
    toast.success(successTitle, 'Saved in prototype session — demo action only.')
  }

  const set = (patch: Partial<WorkQueueQuery>) => setQuery((q) => ({ ...q, ...patch }))
  const today = todayIso()

  const bucket = (predicate: (w: WorkItem) => boolean) => items.filter(predicate)
  const sections = [
    {
      id: 'overdue',
      title: 'Overdue',
      tone: 'text-error' as const,
      icon: TriangleExclamationPoint,
      rows: bucket((w) => w.status !== 'Completed' && w.dueDate < today),
      hidden: query.due === 'today' || query.due === 'upcoming',
    },
    {
      id: 'today',
      title: 'Due Today',
      tone: 'text-warning' as const,
      icon: Clock,
      rows: bucket((w) => w.status !== 'Completed' && w.dueDate === today),
      hidden: query.due === 'overdue' || query.due === 'upcoming',
    },
    {
      id: 'upcoming',
      title: 'Upcoming',
      tone: 'text-primary' as const,
      icon: CalendarClock,
      rows: bucket((w) => w.status !== 'Completed' && w.dueDate > today),
      hidden: query.due === 'overdue' || query.due === 'today',
    },
    {
      id: 'completed',
      title: 'Recently Completed',
      tone: 'text-success' as const,
      icon: CheckCircle2,
      rows: bucket((w) => w.status === 'Completed'),
      hidden: query.due !== 'all' && query.due !== undefined,
    },
  ].filter((s) => !s.hidden)

  if (failed) {
    return (
      <div>
        <PageHeader title="My Work" />
        <Card>
          <ErrorState onRetry={() => void load()} />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="My Work"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>
              Personal supervisory work queue for {currentUser?.fullName ?? 'the demo user'}
            </span>
            <span
              className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase"
            >
              Demo queue — illustrative items
            </span>
          </span>
        }
      />

      {/* Filter bar (DS §8.16) */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/80 px-5 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <TextInput
            label={<span className="overline">Search</span>}
            aria-label="Search work items"
            placeholder="Title or reference…"
            value={query.search ?? ''}
            onChange={(e) => set({ search: e.target.value })}
          />
          <Select
            label="Work type"
            aria-label="Filter by work type"
            value={query.type ?? ''}
            onChange={(e) => set({ type: e.target.value })}
            placeholder="All types"
            options={TYPE_OPTIONS}
          />
          <Select
            label="Priority"
            aria-label="Filter by priority"
            value={query.priority ?? ''}
            onChange={(e) => set({ priority: e.target.value })}
            placeholder="All priorities"
            options={PRIORITY_OPTIONS}
          />
          <Select
            label="Due date"
            aria-label="Filter by due date"
            value={query.due ?? 'all'}
            onChange={(e) => set({ due: e.target.value as WorkQueueQuery['due'] })}
            options={DUE_OPTIONS}
          />
          <Select
            label="Status"
            aria-label="Filter by status"
            value={query.status ?? ''}
            onChange={(e) => set({ status: e.target.value })}
            placeholder="All statuses"
            options={STATUS_OPTIONS}
          />
          <Select
            label="Institution"
            aria-label="Filter by institution"
            value={query.institutionId ?? ''}
            onChange={(e) => set({ institutionId: e.target.value })}
            placeholder="All institutions"
            options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-ink-secondary">
            {items.length} item{items.length === 1 ? '' : 's'} match the current filters · demo data
          </p>
          <Button variant="ghost" size="sm" iconLeft={<Search className="h-3 w-3" />} onClick={() => setQuery({ due: 'all' })}>
            Reset filters
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      ) : (
        <div className="flex flex-col gap-5">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.id}>
                <CardHeader
                  title={
                    <span className={cx('flex items-center gap-2', section.tone)}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {section.title}
                      <span className="rounded-full bg-page px-2 py-0.5 text-[10px] font-semibold text-ink-secondary">
                        {section.rows.length}
                      </span>
                    </span>
                  }
                />
                <CardBody className="p-0">
                  {section.rows.length === 0 ? (
                    <EmptyState
                      title={`Nothing in "${section.title}"`}
                      description="No demo work items match this section with the current filters."
                    />
                  ) : (
                    <ul className="divide-y divide-line-light">
                      {section.rows.map((item) => {
                        const TypeIcon = TYPE_ICONS[item.type]
                        return (
                          <li
                            key={item.id}
                            className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-page md:flex-row md:items-center"
                          >
                            <span
                              aria-hidden="true"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-tint-blue text-primary"
                            >
                              <TypeIcon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-ink">{item.title}</p>
                              <p className="mt-0.5 truncate text-[11px] text-ink-secondary">
                                {WORK_ITEM_TYPE_LABELS[item.type]} · {instName(item.institutionId)}
                                {item.relatedRef ? ` · ${item.relatedRef}` : ''} · due{' '}
                                {formatDate(item.dueDate)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <PriorityBadge priority={item.priority} />
                              <StatusBadge status={item.status} />
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon-sm" aria-label={`Open ${item.title}`} title="Open work item"
                                  onClick={() => navigate(item.link)}>
                                  <FolderSearch className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" aria-label={`Details and notes for ${item.title}`} title="Details / notes"
                                  onClick={() => {
                                    setActiveItem(item)
                                    setNoteText('')
                                    setReassignOpen(false)
                                    setReassignTo('')
                                  }}>
                                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                {canManage && item.status === 'Open' && (
                                  <Button variant="ghost" size="icon-sm" aria-label={`Mark ${item.title} in progress`} title="Mark in progress"
                                    onClick={() =>
                                      void applyAction(
                                        () => workQueueService.setStatus(item.id, 'In Progress', actor),
                                        'Marked in progress',
                                      )
                                    }>
                                    <Play className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                )}
                                {canManage && item.status !== 'Completed' && (
                                  <Button variant="ghost" size="icon-sm" aria-label={`Complete ${item.title}`} title="Mark completed"
                                    onClick={() =>
                                      void applyAction(
                                        () => workQueueService.setStatus(item.id, 'Completed', actor),
                                        'Marked completed',
                                      )
                                    }>
                                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                                  </Button>
                                )}
                                {canReassign && item.status !== 'Completed' && (
                                  <Button variant="ghost" size="icon-sm" aria-label={`Reassign ${item.title}`} title="Reassign"
                                    onClick={() => {
                                      setActiveItem(item)
                                      setReassignOpen(true)
                                      setReassignTo('')
                                    }}>
                                    <UserRoundCog className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail drawer: notes, add note, reassign */}
      <Drawer
        open={activeItem !== null}
        onClose={() => setActiveItem(null)}
        title={
          <span className="flex items-center gap-2">
            Work item
            {activeItem && <StatusBadge status={activeItem.status} />}
          </span>
        }
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveItem(null)}>
              Close
            </Button>
            {activeItem && (
              <Button variant="primary" onClick={() => { navigate(activeItem.link); setActiveItem(null) }}>
                Open work item
              </Button>
            )}
          </div>
        }
      >
        {activeItem && (
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="overline">Title</p>
              <p className="mt-1 text-sm font-semibold text-ink">{activeItem.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="overline">Type</p>
                <p className="mt-1 text-xs text-ink">{WORK_ITEM_TYPE_LABELS[activeItem.type]}</p>
              </div>
              <div>
                <p className="overline">Priority</p>
                <div className="mt-1"><PriorityBadge priority={activeItem.priority} /></div>
              </div>
              <div>
                <p className="overline">Institution</p>
                <button
                  type="button"
                  className="mt-1 cursor-pointer text-xs font-medium text-primary-surface hover:underline"
                  onClick={() => {
                    const id = activeItem.institutionId
                    setActiveItem(null)
                    navigate(`/app/institutions/${id}`)
                  }}
                >
                  {instName(activeItem.institutionId)}
                </button>
              </div>
              <div>
                <p className="overline">Due</p>
                <p className="mt-1 text-xs text-ink">
                  {formatDate(activeItem.dueDate)} ({formatRelativeTime(activeItem.dueDate)})
                </p>
              </div>
              <div>
                <p className="overline">Assigned to</p>
                <p className="mt-1 text-xs text-ink">{activeItem.assignedToName}</p>
              </div>
              {activeItem.relatedRef && (
                <div>
                  <p className="overline">Related record</p>
                  <p className="mt-1 font-mono text-xs text-ink">{activeItem.relatedRef}</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <p className="overline">Notes</p>
              {activeItem.notes.length === 0 ? (
                <p className="mt-1 text-xs text-ink-secondary">No notes yet — add the first demo note below.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {activeItem.notes.map((note) => (
                    <li key={note.id} className="rounded-lg bg-page p-3">
                      <p className="text-xs text-ink">{note.text}</p>
                      <p className="mt-1 text-[10px] text-ink-tertiary">
                        {note.author} · {formatRelativeTime(note.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {canManage && (
                <div className="mt-3">
                  <TextArea
                    label="Add note"
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Demo note — saved in prototype session only…"
                    help="Notes never leave this browser session."
                  />
                  <Button
                    className="mt-2"
                    variant="outline"
                    size="sm"
                    disabled={noteText.trim().length === 0}
                    onClick={() =>
                      void applyAction(
                        () => workQueueService.addNote(activeItem.id, noteText.trim(), actor),
                        'Note added',
                      ).then(() => setNoteText(''))
                    }
                  >
                    Add note (demo)
                  </Button>
                </div>
              )}
            </div>

            {/* Reassign */}
            {canReassign && activeItem.status !== 'Completed' && (
              <div className="rounded-lg border border-line p-3">
                <p className="overline">Reassign</p>
                {!reassignOpen ? (
                  <Button
                    className="mt-2"
                    variant="outline"
                    size="sm"
                    iconLeft={<UserRoundCog className="h-3.5 w-3.5" />}
                    onClick={() => setReassignOpen(true)}
                  >
                    Reassign to a colleague…
                  </Button>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    <Select
                      label="Colleague"
                      aria-label="Reassign to colleague"
                      value={reassignTo}
                      onChange={(e) => setReassignTo(e.target.value)}
                      placeholder="Select a colleague…"
                      options={colleagues
                        .filter((c) => c.id !== activeItem.assignedToId)
                        .map((c) => ({ value: c.id, label: `${c.fullName} — ${c.jobTitle}` }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!reassignTo}
                        onClick={() => {
                          const colleague = colleagues.find((c) => c.id === reassignTo)
                          if (!colleague) return
                          void applyAction(
                            () =>
                              workQueueService.reassign(
                                activeItem.id,
                                colleague.id,
                                colleague.fullName,
                                actor,
                              ),
                            'Work item reassigned',
                          ).then(() => setReassignOpen(false))
                        }}
                      >
                        Reassign (demo)
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setReassignOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
              Prototype drawer — every action here is a demo interaction stored in this session only.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  )
}
