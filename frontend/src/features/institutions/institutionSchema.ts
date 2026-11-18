import { z } from 'zod'

/**
 * Institution creation/edit validation (Spec §5.4):
 * - required identity fields
 * - unique institution code within the regulator (checked async against the
 *   service on submit — the schema validates format only)
 * - valid date ordering (incorporation ≤ licence issue ≤ commencement)
 * - required licence category
 */

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(120, `${label} must be 120 characters or fewer.`)

const isoDate = (label: string) =>
  z
    .string()
    .min(1, `${label} is required.`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${label} must be a valid date.`)

const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a decimal amount (e.g. 1250.75).')

export const institutionFormSchema = z
  .object({
    // 1. Legal identity
    legalName: requiredText('Legal name'),
    tradingName: requiredText('Trading name'),
    code: z
      .string()
      .trim()
      .min(3, 'Institution code is required (min 3 characters).')
      .max(12, 'Institution code must be 12 characters or fewer.')
      .regex(/^[A-Za-z0-9-]+$/, 'Use letters, digits and dashes only (e.g. MCB-001).'),
    registrationNumber: requiredText('Registration number'),
    licenceNumber: requiredText('Licence number'),
    // 2. Classification
    category: requiredText('Institution category'),
    licenceType: requiredText('Licence type'),
    legalForm: requiredText('Legal form'),
    ownershipType: requiredText('Ownership type'),
    // 3. Jurisdiction
    country: requiredText('Country'),
    jurisdictionId: requiredText('Regulator'),
    currency: z
      .string()
      .trim()
      .length(3, 'Currency must be a 3-letter code (e.g. MRD).')
      .regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter code (e.g. MRD).'),
    region: requiredText('Region'),
    // 4. Dates
    incorporation: isoDate('Incorporation date'),
    licenceIssue: isoDate('Licence issue date'),
    commencement: isoDate('Commencement date'),
    // 5. Contacts
    registeredAddress: requiredText('Registered address'),
    website: z.union([
      z.literal(''),
      z.url('Enter a valid website URL (https://…).'),
    ]),
    officialContactName: requiredText('Official contact name'),
    officialContactEmail: z.email('Enter a valid official contact email.'),
    officialContactPhone: requiredText('Official contact phone'),
    regulatoryLiaisonName: requiredText('Regulatory liaison name'),
    regulatoryLiaisonEmail: z.email('Enter a valid regulatory liaison email.'),
    regulatoryLiaisonPhone: requiredText('Regulatory liaison phone'),
    // 6. Supervisory assignment
    teamId: requiredText('Supervisory team'),
    portfolio: requiredText('Portfolio'),
    leadSupervisorName: requiredText('Lead supervisor'),
    // 7. Status and notes
    status: requiredText('Institution status'),
    licenceStatus: requiredText('Licence status'),
    portfolioStatus: requiredText('Portfolio status'),
    riskRating: requiredText('Overall risk rating'),
    /** Kept as strings so the resolver input/output types match; converted on submit. */
    supervisoryRating: z
      .string()
      .regex(/^[1-5]$/, 'Supervisory rating must be a whole number from 1 to 5.'),
    totalAssetsMM: money,
    branchCount: z
      .string()
      .regex(/^\d+$/, 'Branch count must be a non-negative whole number.'),
    onWatchlist: z.boolean(),
    notes: z.string().max(600, 'Notes must be 600 characters or fewer.').optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    // Valid date ordering (Spec §5.4)
    const inc = Date.parse(values.incorporation)
    const lic = Date.parse(values.licenceIssue)
    const com = Date.parse(values.commencement)
    if (!Number.isNaN(inc) && !Number.isNaN(lic) && lic < inc) {
      ctx.addIssue({
        code: 'custom',
        path: ['licenceIssue'],
        message: 'Licence issue date cannot be before the incorporation date.',
      })
    }
    if (!Number.isNaN(lic) && !Number.isNaN(com) && com < lic) {
      ctx.addIssue({
        code: 'custom',
        path: ['commencement'],
        message: 'Commencement date cannot be before the licence issue date.',
      })
    }
    if (!Number.isNaN(inc) && !Number.isNaN(com) && com < inc) {
      ctx.addIssue({
        code: 'custom',
        path: ['commencement'],
        message: 'Commencement date cannot be before the incorporation date.',
      })
    }
  })

export type InstitutionFormValues = z.infer<typeof institutionFormSchema>

export const UNIQUE_CODE_MESSAGE =
  'This institution code is already in use within the regulator. Codes must be unique.'
