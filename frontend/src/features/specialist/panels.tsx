import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-display/DataTable'
import { RelationChip } from '@/features/regulatory/RelationChip'
import { toast } from '@/components/feedback/toastStore'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { DemoPermissionError } from '@/services/contracts/errors'
import type { RiskRating } from '@/types/common'
import type { FrameworkMapping } from '@/types/regulatory'
import type {
  SpecialistAssessmentStatus,
  SpecialistFindingRow,
  SpecialistReportStatus,
} from '@/types/specialist'
import { formatDate } from '@/utils/datetime'

/**
 * Shared building blocks for the consistent §9 specialist page pattern
 * (dashboard · register · detail · checklist & procedures · evidence ·
 * findings · report · history). Every §9 domain instantiates the same
 * components via its `SpecialistDomainSpec` — 4C reuses them unchanged.
 */

export const DEMO_NOTE =
  'All specialist assessments, maturity scores and conclusions are fictional demo data — illustrative only, never official supervisory determinations.'

export function assessmentTone(status: SpecialistAssessmentStatus): StatusTone {
  switch (status) {
    case 'Planned':
      return 'planning'
    case 'In Progress':
      return 'active'
    case 'In Review':
      return 'fieldwork'
    case 'Completed':
      return 'completed'
  }
}

export function reportTone(status: SpecialistReportStatus): StatusTone {
  switch (status) {
    case 'Not Started':
      return 'draft'
    case 'Draft':
      return 'planning'
    case 'In Review':
      return 'fieldwork'
    case 'Issued (demo)':
      return 'completed'
  }
}

export function checklistTone(status: string): StatusTone {
  switch (status) {
    case 'Satisfactory':
      return 'active'
    case 'Deficient':
      return 'overdue'
    case 'In Progress':
      return 'fieldwork'
    case 'Not Applicable':
      return 'closed'
    default:
      return 'draft'
  }
}

export function evidenceTone(status: string): StatusTone {
  switch (status) {
    case 'Reviewed':
      return 'active'
    case 'Received':
      return 'fieldwork'
    case 'Insufficient':
      return 'overdue'
    default:
      return 'planning'
  }
}

/** Relation chip panel (pattern cross-module anchors — no dead ends). */
export function RelationsPanel({
  relations,
  emptyLabel,
}: {
  relations: FrameworkMapping[]
  emptyLabel?: string
}) {
  if (relations.length === 0) {
    return (
      <p className="text-xs text-ink-secondary">
        {emptyLabel ?? 'No cross-module references on this record yet (demo).'}
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {relations.map((m) => (
        <RelationChip key={m.id} mapping={m} />
      ))}
    </div>
  )
}

/** Pattern part 6 — findings table shared by the domain and detail views. */
export function FindingsTable({
  rows,
  loading,
  title,
  emptyDescription,
}: {
  rows: SpecialistFindingRow[]
  loading: boolean
  title?: ReactNode
  emptyDescription?: string
}) {
  const navigate = useNavigate()
  const columns: Array<ColumnDef<SpecialistFindingRow, unknown>> = [
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => (
        <button
          type="button"
          className="cursor-pointer font-mono text-xs font-semibold text-primary-surface hover:underline"
          onClick={(e) => {
            e.stopPropagation()
            navigate(row.original.link)
          }}
        >
          {row.original.reference}
        </button>
      ),
    },
    { accessorKey: 'institutionName', header: 'Institution' },
    { accessorKey: 'title', header: 'Finding' },
    {
      accessorKey: 'riskRating',
      header: 'Risk',
      cell: ({ row }) => <RiskBadge rating={row.original.riskRating as RiskRating} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'raisedDate',
      header: 'Raised',
      cell: ({ row }) => formatDate(row.original.raisedDate),
    },
    {
      accessorKey: 'dueDate',
      header: 'Due',
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
    { accessorKey: 'ownerName', header: 'Owner' },
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      state={loading ? 'loading' : rows.length === 0 ? 'empty' : 'ready'}
      title={title ?? 'Findings'}
      onRowClick={(row) => navigate(row.link)}
      getRowId={(row) => row.id}
      emptyTitle="No findings in this domain"
      emptyDescription={
        emptyDescription ??
        'When the demo dataset contains findings for this domain they appear here — linked to the findings register.'
      }
    />
  )
}

/**
 * Workflow runner shared by the pattern views. Applies the 4A lesson:
 * `busy` is released BEFORE toasting so follow-up controls are enabled in
 * the same render the confirmation appears.
 */
export function makeWorkflowRunner(
  setBusy: (busy: boolean) => void,
  reload: () => Promise<unknown>,
) {
  return async (label: string, fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true)
    try {
      const result = await fn()
      setBusy(false)
      if (!result) {
        toast.error('Demo action unavailable', `${label} is not valid from the current state.`)
        return false
      }
      toast.success('Saved in prototype session', `${label} recorded — demo data only.`)
      await reload()
      return true
    } catch (err) {
      setBusy(false)
      if (err instanceof DemoPermissionError) toast.error('Demo permission denied', err.message)
      else toast.error('Demo action failed', `${label} could not be completed in the demo session.`)
      return false
    }
  }
}
