import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardList, MapPin } from 'lucide-react'
import { DataTable } from '@/components/data-display/DataTable'
import { LoadingSkeleton } from '@/components/feedback/States'
import { Select, TextInput } from '@/components/forms/FormControls'
import { RiskBadge, StatusBadge, type StatusTone } from '@/components/ui/Badges'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { PageHeader } from '@/components/ui/PageHeader'
import { branchService } from '@/services/mock/MockBranchService'
import { institutionService } from '@/services/mock/MockInstitutionService'
import type { Branch, Institution } from '@/types/institution'
import { formatDate } from '@/utils/datetime'

/**
 * Branch Network (Spec §5.6): register with institution/region/status
 * filters, branch detail drawer and branch examination history.
 */

const STATUS_TONES: Record<string, StatusTone> = {
  Operational: 'active',
  Suspended: 'overdue',
  Relocating: 'fieldwork',
  Closed: 'closed',
}

const STATUSES = ['Operational', 'Suspended', 'Relocating', 'Closed']

export function BranchNetworkPage() {
  const navigate = useNavigate()
  const [branches, setBranches] = useState<Branch[] | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [institutionFilter, setInstitutionFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null)

  const load = useCallback(async () => {
    const [branchList, instPage, regionList] = await Promise.all([
      branchService.list({
        institutionId: institutionFilter || undefined,
        region: regionFilter || undefined,
        operationalStatus: statusFilter || undefined,
        search,
      }),
      institutionService.list({ page: 1, pageSize: 200 }),
      branchService.regions(),
    ])
    setBranches(branchList)
    setInstitutions(instPage.items)
    setRegions(regionList)
  }, [institutionFilter, regionFilter, statusFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])

  const columns = useMemo<Array<ColumnDef<Branch, unknown>>>(
    () => [
      {
        accessorKey: 'name',
        header: 'Branch',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-ink">{row.original.name}</p>
            <p className="font-mono text-[10px] text-ink-secondary">{row.original.code}</p>
          </div>
        ),
      },
      {
        id: 'institution',
        accessorFn: (row) => instById.get(row.institutionId)?.tradingName ?? '',
        header: 'Institution',
      },
      { accessorKey: 'region', header: 'Region' },
      { accessorKey: 'type', header: 'Type' },
      {
        accessorKey: 'operationalStatus',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge status={row.original.operationalStatus} tone={STATUS_TONES[row.original.operationalStatus]} />
        ),
      },
      {
        accessorKey: 'riskClassification',
        header: 'Risk',
        cell: ({ row }) => <RiskBadge rating={row.original.riskClassification} />,
      },
      {
        accessorKey: 'lastVisitDate',
        header: 'Last visit',
        cell: ({ getValue }) => {
          const v = getValue<string | undefined>()
          return <span className="text-xs text-ink-secondary">{v ? formatDate(v) : '—'}</span>
        },
      },
    ],
    [instById],
  )

  return (
    <div>
      <PageHeader
        title="Branch Network"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>Every branch of every supervised demo institution</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent-dark uppercase">
              Fictional demo locations
            </span>
          </span>
        }
      />

      {branches === null ? (
        <LoadingSkeleton rows={8} className="rounded-xl border border-line bg-card" />
      ) : (
        <DataTable<Branch>
          columns={columns}
          data={branches}
          title="Branch register"
          headerAction={<span className="text-xs text-ink-secondary">{branches.length} branches · demo data</span>}
          getRowId={(row) => row.id}
          onRowClick={(row) => setActiveBranch(row)}
          initialPageSize={10}
          emptyTitle="No branches match"
          emptyDescription="Adjust the filters — the demo network covers all eight fictional institutions."
          toolbar={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TextInput
                aria-label="Search branches"
                placeholder="Search name, code, address or manager…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                aria-label="Filter by institution"
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                placeholder="All institutions"
                options={institutions.map((i) => ({ value: i.id, label: i.tradingName }))}
              />
              <Select
                aria-label="Filter by region"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                placeholder="All regions"
                options={regions.map((r) => ({ value: r, label: r }))}
              />
              <Select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="All statuses"
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </div>
          }
        />
      )}

      {/* Branch detail drawer with examination history (Spec §5.6) */}
      <Drawer
        open={activeBranch !== null}
        onClose={() => setActiveBranch(null)}
        title={
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {activeBranch?.name ?? ''}
          </span>
        }
        footer={
          activeBranch && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  const inst = instById.get(activeBranch.institutionId)
                  setActiveBranch(null)
                  if (inst) navigate(`/app/institutions/${inst.id}`)
                }}
              >
                Open institution profile
              </Button>
            </div>
          )
        }
      >
        {activeBranch && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="overline">Branch code</p>
                <p className="mt-0.5 font-mono text-xs text-ink">{activeBranch.code}</p>
              </div>
              <div>
                <p className="overline">Institution</p>
                <p className="mt-0.5 text-xs text-ink">
                  {instById.get(activeBranch.institutionId)?.tradingName ?? '—'}
                </p>
              </div>
              <div>
                <p className="overline">Type</p>
                <p className="mt-0.5 text-xs text-ink">{activeBranch.type}</p>
              </div>
              <div>
                <p className="overline">Operational status</p>
                <div className="mt-0.5">
                  <StatusBadge status={activeBranch.operationalStatus} tone={STATUS_TONES[activeBranch.operationalStatus]} />
                </div>
              </div>
              <div>
                <p className="overline">Risk classification</p>
                <div className="mt-0.5"><RiskBadge rating={activeBranch.riskClassification} /></div>
              </div>
              <div>
                <p className="overline">Opened</p>
                <p className="mt-0.5 text-xs text-ink">{formatDate(activeBranch.openedDate)}</p>
              </div>
              <div>
                <p className="overline">Last supervisory visit</p>
                <p className="mt-0.5 text-xs text-ink">
                  {activeBranch.lastVisitDate ? formatDate(activeBranch.lastVisitDate) : 'No visit recorded (demo)'}
                </p>
              </div>
              <div>
                <p className="overline">Branch manager</p>
                <p className="mt-0.5 text-xs text-ink">{activeBranch.managerName}</p>
              </div>
            </div>
            <div>
              <p className="overline">Address</p>
              <p className="mt-0.5 text-xs text-ink">
                {activeBranch.address} · {activeBranch.region}
              </p>
            </div>
            <div>
              <p className="overline">Examination history</p>
              {activeBranch.examinationRefs.length === 0 ? (
                <p className="mt-1 text-xs text-ink-secondary">
                  No examination touched this branch in the demo dataset.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {activeBranch.examinationRefs.map((ref) => (
                    <li key={ref}>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-line bg-page px-3 py-2 text-left transition-colors hover:border-primary-surface"
                        onClick={() => navigate('/app/examinations')}
                      >
                        <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="font-mono text-xs font-semibold text-ink">{ref}</span>
                        <span className="text-[10px] text-ink-secondary">
                          examination touched this branch — open register (detail lands in Phase 2B)
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="rounded-lg bg-accent/5 px-3 py-2 text-[10px] leading-relaxed text-accent-dark">
              Prototype drawer — branch records are fictional demo data.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  )
}
