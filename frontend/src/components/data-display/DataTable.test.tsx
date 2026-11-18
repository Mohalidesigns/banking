import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-display/DataTable'

interface Row {
  id: string
  institution: string
  amount: number
}

const DATA: Row[] = [
  { id: 'r1', institution: 'Meridian Commercial Bank', amount: 1200 },
  { id: 'r2', institution: 'Northstar Merchant Bank', amount: 900 },
  { id: 'r3', institution: 'Unity Non-Interest Bank', amount: 1500 },
  { id: 'r4', institution: 'Crestline Payment Bank', amount: 300 },
  { id: 'r5', institution: 'Meridian Commercial Bank', amount: 800 },
  { id: 'r6', institution: 'Northstar Merchant Bank', amount: 450 },
  { id: 'r7', institution: 'Unity Non-Interest Bank', amount: 2100 },
  { id: 'r8', institution: 'Crestline Payment Bank', amount: 750 },
  { id: 'r9', institution: 'Meridian Commercial Bank', amount: 990 },
  { id: 'r10', institution: 'Northstar Merchant Bank', amount: 1310 },
  { id: 'r11', institution: 'Unity Non-Interest Bank', amount: 640 },
  { id: 'r12', institution: 'Crestline Payment Bank', amount: 1780 },
]

const columns: Array<ColumnDef<Row, unknown>> = [
  { accessorKey: 'institution', header: 'Institution' },
  { accessorKey: 'amount', header: 'Amount' },
]

const bodyRows = () => screen.getAllByRole('row').slice(1)

describe('DataTable', () => {
  it('sorts ascending then descending when the header is clicked', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={columns} data={DATA} initialPageSize={5} />)

    const firstCell = () => within(bodyRows()[0]).getAllByRole('cell')[0]
    expect(firstCell()).toHaveTextContent('Meridian Commercial Bank')

    // TanStack Table cycles descending first by default.
    await user.click(screen.getByRole('button', { name: /amount/i }))
    expect(firstCell()).toHaveTextContent('Unity Non-Interest Bank')
    expect(within(bodyRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('2100')

    await user.click(screen.getByRole('button', { name: /amount/i }))
    expect(firstCell()).toHaveTextContent('Crestline Payment Bank')
    expect(within(bodyRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('300')
  })

  it('paginates with the page-size selector and next-page control', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={columns} data={DATA} initialPageSize={5} />)

    expect(bodyRows()).toHaveLength(5)
    expect(screen.getByText(/1–5 of 12/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next page/i }))
    expect(screen.getByText(/6–10 of 12/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/rows per page/i), '10')
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByText(/1–10 of 12/)).toBeInTheDocument()
  })

  it('supports row selection with a select-all control', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        columns={columns}
        data={DATA}
        enableRowSelection
        initialPageSize={5}
        selectionAction={(_rows, clear) => (
          <button type="button" onClick={clear}>
            Clear selection
          </button>
        )}
      />,
    )

    await user.click(screen.getByLabelText(/select all rows on page/i))
    expect(screen.getAllByLabelText(/^select row$/i).filter((c) => (c as HTMLInputElement).checked)).toHaveLength(5)
    expect(screen.getByText(/5 rows selected/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(screen.queryByText(/rows selected/)).not.toBeInTheDocument()
  })

  it('renders the empty state when there is no demo data', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="No institutions yet"
        emptyDescription="Demo registry is empty."
      />,
    )
    expect(screen.getByText('No institutions yet')).toBeInTheDocument()
    expect(screen.getByText('Demo registry is empty.')).toBeInTheDocument()
  })
})
