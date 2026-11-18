import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Download,
  EllipsisVertical,
  Eye,
  History,
  Pencil,
  Plus,
  Upload,
  Users,
} from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { toast } from '@/components/feedback/toastStore'
import { Select, TextInput } from '@/components/forms/FormControls'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { can } from '@/config/roles'
import { AssignTeamModal } from '@/features/institutions/AssignTeamModal'
import { ImportInstitutionsModal } from '@/features/institutions/ImportInstitutionsModal'
import { InstitutionFormModal } from '@/features/institutions/InstitutionFormModal'
import { InstitutionHistoryDrawer } from '@/features/institutions/InstitutionHistoryDrawer'
import type { SupervisoryTeamOption } from '@/services/contracts/InstitutionService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import { useSessionStore } from '@/store/sessionStore'
import type { Jurisdiction } from '@/types/auth'
import { INSTITUTION_CATEGORIES, type Institution } from '@/types/institution'
import { exportCsv } from '@/utils/exportCsv'
import { formatDate } from '@/utils/datetime'

/**
 * Institution Registry (Spec §5.4): searchable/filterable/sortable table of
 * the demo registry with add, mock import, export and per-row
 * view/edit/assign-team/history actions. Data comes only from
 * InstitutionService; role actions follow the Spec §19 permission profiles.
 */

const LICENCE_TONES: Record<string, StatusTone> = {
  Active: 'active',
  Provisional: 'planning',
  Suspended: 'overdue',
  Revoked: 'closed',
}

const PORTFOLIO_TONES: Record<string, StatusTone> = {
  Satisfactory: 'active',
  'Under Review': 'planning',
  Watch: 'fieldwork',
  Deteriorating: 'overdue',
}

const RISK_OPTIONS = ['Critical', 'High', 'Medium', 'Low'].map((r) => ({ value: r, label: r }))
const LICENCE_STATUS_OPTIONS = ['Active', 'Provisional', 'Suspended', 'Revoked'].map((s) => ({
  value: s,
  label: s,
}))

interface Filters {
  q: string
  category: string
  status: string
  risk: string
  team: string
  region: string
}

const filtersFromParams = (params: URLSearchParams): Filters => ({
  q: params.get('q') ?? '',
  category: params.get('category') ?? '',
  status: params.get('status') ?? '',
  // Command Centre KPI navigates with risk=Critical,High
  risk: params.get('risk') ?? '',
  team: params.get('team') ?? '',
  region: params.get('region') ?? '',
})

export function InstitutionRegistryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUser = useSessionStore((s) => s.currentUser)
  const sessionJurisdiction = useSessionStore((s) => s.jurisdiction)

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
  const [rows, setRows] = useState<Institution[]>([])
  const [allRegions, setAllRegions] = useState<string[]>([])
  const [teams, setTeams] = useState<SupervisoryTeamOption[]>([])
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [staff, setStaff] = useState<Array<{ id: string; fullName: string; jobTitle: string }>>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Institution | null>(null)
  const [assignTarget, setAssignTarget] = useState<Institution | null>(null)
  const [historyTarget, setHistoryTarget] = useState<Institution | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const allowed = {
    create: currentUser ? can(currentUser.role, 'create-institution') : false,
    edit: currentUser ? can(currentUser.role, 'edit-institution') : false,
    assign: currentUser ? can(currentUser.role, 'assign-team') : false,
    import: currentUser ? can(currentUser.role, 'import-institutions') : false,
    export: currentUser ? can(currentUser.role, 'export') : false,
  }

  // Reference data (teams, jurisdictions, staff, region options)
  useEffect(() => {
    let active = true
    void Promise.all([
      institutionService.listTeams(),
      institutionService.listJurisdictions(),
      institutionService.listStaff(),
      institutionService.list({ page: 1, pageSize: 200 }),
    ]).then(([teamList, juris, staffList, all]) => {
      if (!active) return
      setTeams(teamList)
      setJurisdictions(juris)
      setStaff(staffList)
      setAllRegions([...new Set(all.items.map((i) => i.region))].sort())
    })
    return () => {
      active = false
    }
  }, [])

  const loadRows = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const page = await institutionService.list({
        page: 1,
        pageSize: 200,
        search: filters.q,
        category: (filters.category || '') as never,
        licenceStatus: (filters.status || '') as never,
        riskRating: filters.risk,
        teamId: filters.team || undefined,
        region: filters.region || undefined,
      })
      setRows(page.items)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  // Keep the URL query string in sync so filtered views are shareable and
  // Command Centre KPI navigation works while this page is already open.
  useEffect(() => {
    const next = new URLSearchParams()
    if (filters.q) next.set('q', filters.q)
    if (filters.category) next.set('category', filters.category)
    if (filters.status) next.set('status', filters.status)
    if (filters.risk) next.set('risk', filters.risk)
    if (filters.team) next.set('team', filters.team)
    if (filters.region) next.set('region', filters.region)
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const jurisdictionName = useMemo(() => {
    const map = new Map(jurisdictions.map((j) => [j.id, j.code]))
    return (id: string) => map.get(id) ?? '—'
  }, [jurisdictions])

  const setFilter = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))
  const resetFilters = () => setFilters({ q: '', category: '', status: '', risk: '', team: '', region: '' })

  const handleExport = () => {
    exportCsv(
      'institution-registry.csv',
      [
        'Code',
        'Legal name',
        'Category',
        'Jurisdiction',
        'Team',
        'Risk rating',
        'Supervisory rating',
        'Licence status',
        'Portfolio status',
        'Last examination',
        'Open findings',
        'Total assets (MM)',
      ],
      rows.map((i) => [
        i.code,
        i.legalName,
        i.category,
        jurisdictionName(i.jurisdictionId),
        i.supervisory.teamName,
        i.riskRating,
        i.supervisoryRating,
        i.licenceStatus,
        i.portfolioStatus,
        i.lastExaminationDate ?? '—',
        i.openFindingsCount,
        i.totalAssetsMM,
      ]),
    )
    toast.success('Export ready', 'Prototype CSV of the current filtered view downloaded. Demo data only.')
  }

  const columns = useMemo<Array<ColumnDef<Institution, unknown>>>(
    () => [
      {
        accessorKey: 'legalName',
        header: 'Institution',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{row.original.tradingName}</p>
            <p className="font-mono text-[10px] text-ink-secondary">{row.original.code}</p>
          </div>
        ),
      },
      {
        accessorKey: 'licenceNumber',
        header: 'Licence #',
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-ink-secondary">{getValue<string>()}</span>
        ),
      },
      { accessorKey: 'category', header: 'Category' },
      {
        id: 'jurisdiction',
        accessorFn: (row) => jurisdictionName(row.jurisdictionId),
        header: 'Jurisdiction',
      },
      {
        id: 'team',
        accessorFn: (row) => row.supervisory.teamName,
        header: 'Supervisory team',
      },
      {
        accessorKey: 'supervisoryRating',
        header: 'Rating',
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <RiskBadge rating={row.original.riskRating} />
            <span className="text-[11px] text-ink-secondary" title="Composite supervisory rating (1 strongest – 5 weakest, demo)">
              C{row.original.supervisoryRating}
            </span>
          </span>
        ),
      },
      {
        accessorKey: 'licenceStatus',
        header: 'Licence status',
        cell: ({ row }) => (
          <StatusBadge status={row.original.licenceStatus} tone={LICENCE_TONES[row.original.licenceStatus]} />
        ),
      },
      {
        accessorKey: 'lastExaminationDate',
        header: 'Last exam',
        cell: ({ getValue }) => {
          const v = getValue<string | undefined>()
          return <span className="text-xs text-ink-secondary">{v ? formatDate(v) : '—'}</span>
        },
      },
      {
        accessorKey: 'openFindingsCount',
        header: 'Open findings',
        cell: ({ getValue }) => {
          const n = getValue<number>()
          return n > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-tint-red px-1.5 text-[11px] font-semibold text-error">
              {n}
            </span>
          ) : (
            <span className="text-xs text-ink-tertiary">0</span>
          )
        },
      },
      {
        accessorKey: 'portfolioStatus',
        header: 'Portfolio status',
        cell: ({ row }) => (
          <StatusBadge status={row.original.portfolioStatus} tone={PORTFOLIO_TONES[row.original.portfolioStatus]} />
        ),
      },
    ],
    [jurisdictionName],
  )

  return (
    <div>
      <PageHeader
        title="Institution Registry"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>All institutions supervised in this demo environment</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Fictional demo records
            </span>
          </span>
        }
        actions={
          <>
            {allowed.import && (
              <Button variant="outline" iconLeft={<Upload className="h-3.5 w-3.5" />} onClick={() => setImportOpen(true)}>
                Import
              </Button>
            )}
            {allowed.export && (
              <Button variant="outline" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>
                Export
              </Button>
            )}
            {allowed.create && (
              <Button variant="primary" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditing(null); setFormOpen(true) }}>
                Add institution
              </Button>
            )}
          </>
        }
      />

      <DataTable<Institution>
        columns={columns}
        data={rows}
        state={failed ? 'error' : loading ? 'loading' : 'ready'}
        onRetry={() => void loadRows()}
        title="Supervised institutions"
        headerAction={
          <span className="text-xs text-ink-secondary">
            {rows.length} record{rows.length === 1 ? '' : 's'} · demo data
          </span>
        }
        toolbar={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <TextInput
              aria-label="Search institutions"
              placeholder="Search name, code or licence…"
              value={filters.q}
              onChange={(e) => setFilter({ q: e.target.value })}
            />
            <Select
              aria-label="Filter by category"
              value={filters.category}
              onChange={(e) => setFilter({ category: e.target.value })}
              placeholder="All categories"
              options={INSTITUTION_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              aria-label="Filter by licence status"
              value={filters.status}
              onChange={(e) => setFilter({ status: e.target.value })}
              placeholder="All licence statuses"
              options={LICENCE_STATUS_OPTIONS}
            />
            <Select
              aria-label="Filter by risk rating"
              value={filters.risk}
              onChange={(e) => setFilter({ risk: e.target.value })}
              placeholder="All risk ratings"
              options={RISK_OPTIONS}
            />
            <Select
              aria-label="Filter by supervisory team"
              value={filters.team}
              onChange={(e) => setFilter({ team: e.target.value })}
              placeholder="All teams"
              options={teams.map((t) => ({ value: t.id, label: t.name }))}
            />
            <Select
              aria-label="Filter by region"
              value={filters.region}
              onChange={(e) => setFilter({ region: e.target.value })}
              placeholder="All regions"
              options={allRegions.map((r) => ({ value: r, label: r }))}
            />
          </div>
        }
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/app/institutions/${row.id}`)}
        initialPageSize={10}
        emptyTitle="No institutions match"
        emptyDescription="Adjust the search or filters — this demo registry contains eight fictional institutions."
        emptyAction={
          (filters.q || filters.category || filters.status || filters.risk || filters.team || filters.region)
            ? { label: 'Reset filters', onClick: resetFilters }
            : undefined
        }
        rowActions={(row) => (
          <DropdownMenu
            ariaLabel={`Row actions for ${row.tradingName}`}
            renderTrigger={({ triggerProps }) => (
              <Button variant="ghost" size="icon-sm" aria-label={`Row actions for ${row.tradingName}`} {...triggerProps}>
                <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <DropdownMenuItem
                  icon={<Eye />}
                  onSelect={() => {
                    close()
                    navigate(`/app/institutions/${row.id}`)
                  }}
                >
                  View profile
                </DropdownMenuItem>
                {allowed.edit && (
                  <DropdownMenuItem
                    icon={<Pencil />}
                    onSelect={() => {
                      close()
                      setEditing(row)
                      setFormOpen(true)
                    }}
                  >
                    Edit institution
                  </DropdownMenuItem>
                )}
                {allowed.assign && (
                  <DropdownMenuItem
                    icon={<Users />}
                    onSelect={() => {
                      close()
                      setAssignTarget(row)
                    }}
                  >
                    Assign team
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  icon={<History />}
                  onSelect={() => {
                    close()
                    setHistoryTarget(row)
                  }}
                >
                  View history
                </DropdownMenuItem>
              </div>
            )}
          </DropdownMenu>
        )}
      />

      <InstitutionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(saved, mode) => {
          void loadRows()
          if (mode === 'create') navigate(`/app/institutions/${saved.id}`)
        }}
        existing={editing}
        teams={teams}
        jurisdictions={jurisdictions}
        staff={staff}
        defaultJurisdictionId={sessionJurisdiction?.id}
      />

      <AssignTeamModal
        open={assignTarget !== null}
        institution={assignTarget}
        teams={teams}
        onClose={() => setAssignTarget(null)}
        onAssigned={() => void loadRows()}
      />

      <InstitutionHistoryDrawer institution={historyTarget} onClose={() => setHistoryTarget(null)} />

      <ImportInstitutionsModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
