import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstitutionFormModal } from '@/features/institutions/InstitutionFormModal'
import { institutionFormSchema, UNIQUE_CODE_MESSAGE } from '@/features/institutions/institutionSchema'
import { JURISDICTIONS } from '@/mocks/fixtures/identity.fixture'
import { INSTITUTIONS } from '@/mocks/fixtures/institutions.fixture'
import { SUPERVISORY_TEAMS } from '@/mocks/fixtures/people.fixture'

/**
 * Institution create/edit form validation (Spec §5.4):
 * unique institution code within the regulator and valid date ordering.
 */

const teams = SUPERVISORY_TEAMS.map((t) => ({
  id: t.id,
  name: t.name,
  department: t.department,
  leadName: t.leadName,
}))

const staff = [
  { id: 's1', fullName: 'Daniel Adeyemi', jobTitle: 'Supervisory Team Lead' },
  { id: 's2', fullName: 'Chuka Eze', jobTitle: 'Principal Examiner' },
]

const northstar = INSTITUTIONS[1] // NMB-002
const meridianCode = INSTITUTIONS[0].code // MCB-001 — taken

function renderEditModal() {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(
    <InstitutionFormModal
      open
      onClose={onClose}
      onSaved={onSaved}
      existing={northstar}
      teams={teams}
      jurisdictions={JURISDICTIONS}
      staff={staff}
    />,
  )
  return { onClose, onSaved }
}

describe('institution form schema (date ordering)', () => {
  const validValues = {
    legalName: 'Test Bank Plc',
    tradingName: 'Test Bank',
    code: 'TST-999',
    registrationNumber: 'RC-DEMO-0001',
    licenceNumber: 'LIC/TEST/0001',
    category: 'Commercial Bank',
    licenceType: 'Commercial Banking Licence',
    legalForm: 'Public Limited Company',
    ownershipType: 'Private',
    country: 'Meridia (fictional)',
    jurisdictionId: JURISDICTIONS[0].id,
    currency: 'MRD',
    region: 'Capital District',
    incorporation: '2001-01-01',
    licenceIssue: '2005-01-01',
    commencement: '2006-01-01',
    registeredAddress: '1 Test Street',
    website: '',
    officialContactName: 'Test Person',
    officialContactEmail: 'test@bank.demo',
    officialContactPhone: '+000 000 000',
    regulatoryLiaisonName: 'Liaison Person',
    regulatoryLiaisonEmail: 'liaison@bank.demo',
    regulatoryLiaisonPhone: '+000 000 001',
    teamId: teams[0].id,
    portfolio: 'Test Portfolio',
    leadSupervisorName: 'Daniel Adeyemi',
    status: 'Active',
    licenceStatus: 'Active',
    portfolioStatus: 'Satisfactory',
    riskRating: 'Low',
    supervisoryRating: '2',
    totalAssetsMM: '10.00',
    branchCount: '1',
    onWatchlist: false,
    notes: '',
  }

  it('accepts correctly ordered dates', () => {
    const result = institutionFormSchema.safeParse(validValues)
    expect(result.success).toBe(true)
  })

  it('rejects a licence issue date before incorporation', () => {
    const result = institutionFormSchema.safeParse({
      ...validValues,
      licenceIssue: '2000-01-01',
      commencement: '2006-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      const messages = result.error.issues.map((i) => i.message)
      expect(paths).toContain('licenceIssue')
      expect(messages.some((m) => /incorporation/i.test(m))).toBe(true)
    }
  })

  it('rejects a commencement date before the licence issue date', () => {
    const result = institutionFormSchema.safeParse({
      ...validValues,
      commencement: '2003-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'commencement')).toBe(true)
    }
  })
})

describe('InstitutionFormModal unique code validation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('rejects an institution code already in use within the regulator', async () => {
    const user = userEvent.setup()
    renderEditModal()

    const codeInput = await screen.findByLabelText(/institution code/i)
    fireEvent.change(codeInput, { target: { value: meridianCode } })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(UNIQUE_CODE_MESSAGE, {}, { timeout: 4000 })).toBeInTheDocument()
  })

  it('accepts a fresh unique code and saves in the prototype session', async () => {
    const user = userEvent.setup()
    const { onSaved } = renderEditModal()

    const codeInput = await screen.findByLabelText(/institution code/i)
    fireEvent.change(codeInput, { target: { value: 'NMB-777' } })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 4000 })
    const saved = onSaved.mock.calls[0][0]
    expect(saved.code).toBe('NMB-777')
    expect(onSaved.mock.calls[0][1]).toBe('edit')
  })

  it('blocks submission when the commencement date precedes the licence issue date', async () => {
    const user = userEvent.setup()
    const { onSaved } = renderEditModal()

    const commencement = await screen.findByLabelText(/commencement date/i)
    fireEvent.change(commencement, { target: { value: '2000-01-01' } })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText(/commencement date cannot be before/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
