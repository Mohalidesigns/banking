import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { cx } from '@/utils/cx'

/**
 * DataTable per DS §8.10 and Spec §17.1: card-wrapped table, uppercase
 * overline header on #F7FAFC, 12–13px body cells, sorting, pagination with
 * page-size selector, optional row selection and a column actions slot.
 * Loading / empty / error states are designed, not deferred.
 */
export interface DataTableProps<T> {
  columns: Array<ColumnDef<T, unknown>>
  data: T[]
  /** 'ready' renders rows; other states render the designed placeholders. */
  state?: 'ready' | 'loading' | 'empty' | 'error'
  title?: ReactNode
  /** Card header right-side action (DS §8.10 "action link"). */
  headerAction?: ReactNode
  /** Filter bar / toolbar slot rendered above the table. */
  toolbar?: ReactNode
  enableRowSelection?: boolean
  /** Per-row action controls rendered in a trailing sticky-right cell. */
  rowActions?: (row: T) => ReactNode
  onRowClick?: (row: T) => void
  getRowId?: (row: T) => string
  initialPageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  onRetry?: () => void
  /** Banner shown when rows are selected. */
  selectionAction?: (selectedRows: T[], clear: () => void) => ReactNode
}

export function DataTable<T>({
  columns,
  data,
  state = 'ready',
  title,
  headerAction,
  toolbar,
  enableRowSelection = false,
  rowActions,
  onRowClick,
  getRowId,
  initialPageSize = 10,
  emptyTitle = 'No records yet',
  emptyDescription = 'When demo data exists for this view it will appear here.',
  emptyAction,
  onRetry,
  selectionAction,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: initialPageSize })

  const allColumns = useMemo(() => {
    const cols = [...columns]
    if (rowActions) {
      cols.push({
        id: '__actions',
        header: () => <span className="sr-only">Row actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            {rowActions(row.original)}
          </div>
        ),
      })
    }
    return cols
  }, [columns, rowActions])

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, rowSelection, pagination },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection,
    getRowId,
  })

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original)
  const showTable = state === 'ready' && data.length > 0

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      {(title || headerAction) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="section-title min-w-0 truncate">{title}</div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      {toolbar && <div className="border-b border-line px-5 py-3">{toolbar}</div>}

      {state === 'loading' && <LoadingSkeleton rows={6} />}
      {state === 'error' && <ErrorState onRetry={onRetry} />}
      {state === 'empty' && (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      )}

      {showTable && (
        <>
          {selectionAction && selectedRows.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-line bg-tint-blue px-5 py-2.5">
              <span className="text-xs font-semibold text-primary">
                {selectedRows.length} row{selectedRows.length === 1 ? '' : 's'} selected
              </span>
              {selectionAction(selectedRows, () => table.resetRowSelection())}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-page">
                    {enableRowSelection && (
                      <th scope="col" className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          aria-label="Select all rows on page"
                          checked={table.getIsAllPageRowsSelected()}
                          onChange={table.getToggleAllPageRowsSelectedHandler()}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-primary"
                        />
                      </th>
                    )}
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted()
                      const canSort = header.column.getCanSort()
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                          }
                          className="px-4 py-2.5 text-[10px] font-semibold tracking-[0.5px] text-ink-secondary uppercase select-none"
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-primary"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3 w-3" aria-hidden="true" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3 w-3" aria-hidden="true" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                              )}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cx(
                      'border-t border-line-light transition-colors hover:bg-gray-50',
                      onRowClick && 'cursor-pointer',
                      row.getIsSelected() && 'bg-tint-blue/50',
                    )}
                  >
                    {enableRowSelection && (
                      <td className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={row.getIsSelected()}
                          disabled={!row.getCanSelect()}
                          onChange={row.getToggleSelectedHandler()}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-primary"
                        />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2.5 text-[13px] text-ink">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination per DS §8.21 */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <label htmlFor="page-size" className="text-xs text-ink-secondary">
                Rows per page
              </label>
              <select
                id="page-size"
                value={pagination.pageSize}
                onChange={(e) =>
                  setPagination((p) => ({ ...p, pageIndex: 0, pageSize: Number(e.target.value) }))
                }
                className="cursor-pointer rounded-md border border-line bg-card px-2 py-1 text-xs shadow-sm outline-none focus:border-primary"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink-secondary">
                {table.getState().pagination.pageIndex * pagination.pageSize + 1}–
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * pagination.pageSize,
                  data.length,
                )}{' '}
                of {data.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous page"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              {table.getPageOptions().map((page) => (
                <button
                  key={page}
                  type="button"
                  aria-label={`Page ${page + 1}`}
                  aria-current={page === table.getState().pagination.pageIndex ? 'page' : undefined}
                  onClick={() => table.setPageIndex(page)}
                  className={cx(
                    'min-w-8 cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors',
                    page === table.getState().pagination.pageIndex
                      ? 'bg-primary font-semibold text-white'
                      : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  {page + 1}
                </button>
              ))}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next page"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      )}

      {state === 'ready' && data.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      )}
    </div>
  )
}
