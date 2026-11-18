/**
 * Evidence repository demo records (Spec §7.6). Every item links into the
 * same story-world: EXM-2026-014 fieldwork procedures and findings, the
 * Delta follow-up sampling pack (My Work evidence-review item), Crestline
 * cyber evidence and Vanguard capital-restoration batches. Integrity hashes
 * are placeholders; nothing is really uploaded or stored. Demo data only.
 */
import { demoUuid, isoDay, isoDateTime } from '@/mocks/fixtures/demoIds'
import { INST_IDS } from '@/mocks/fixtures/institutions.fixture'
import { EXAMINATIONS, FINDINGS } from '@/mocks/fixtures/supervision.fixture'
import { procedureIdByExamRefAndCode } from '@/mocks/fixtures/examinationDetail.fixture'
import type { EvidenceItem } from '@/types/examination'

const examId = (ref: string): string => {
  const e = EXAMINATIONS.find((x) => x.reference === ref)
  if (!e) throw new Error(`demo examination missing: ${ref}`)
  return e.id
}

const findingId = (ref: string): string => {
  const f = FINDINGS.find((x) => x.reference === ref)
  if (!f) throw new Error(`demo finding missing: ${ref}`)
  return f.id
}

interface EvidenceSeed {
  n: number
  title: string
  fileName: string
  mimeType: string
  sizeKb: number
  institutionId: string
  examinationRef?: string
  procedure?: { examRef: string; code: string }
  findingRefs?: string[]
  domainName: string
  category: string
  confidentiality: EvidenceItem['confidentiality']
  uploadedByName: string
  uploadedOffsetDays: number
  version: number
  reviewStatus: EvidenceItem['reviewStatus']
  reviewerName?: string
  reviewerNote?: string
  sourceDescription: string
  collectedOffsetDays: number
  linkedFindingRefs?: string[]
}

const demoHash = (n: number): string =>
  `sha256-demo:${demoUuid(61, n).replace(/-/g, '').slice(0, 16)}…${demoUuid(62, n).replace(/-/g, '').slice(0, 8)} (placeholder)`

const ev = (seed: EvidenceSeed): EvidenceItem => {
  const procedureId = seed.procedure
    ? procedureIdByExamRefAndCode(seed.procedure.examRef, seed.procedure.code)
    : undefined
  return {
    id: demoUuid(60, seed.n),
    reference: `EV-2026-${100 + seed.n}`,
    title: seed.title,
    fileName: seed.fileName,
    mimeType: seed.mimeType,
    sizeKb: seed.sizeKb,
    institutionId: seed.institutionId,
    examinationId: seed.examinationRef ? examId(seed.examinationRef) : undefined,
    examinationRef: seed.examinationRef,
    procedureId,
    findingId: seed.findingRefs?.length ? findingId(seed.findingRefs[0]) : undefined,
    domainName: seed.domainName,
    category: seed.category,
    confidentiality: seed.confidentiality,
    uploadedByName: seed.uploadedByName,
    uploadedAt: isoDateTime(seed.uploadedOffsetDays, 13, 45),
    version: seed.version,
    reviewStatus: seed.reviewStatus,
    reviewerName: seed.reviewerName,
    reviewerNote: seed.reviewerNote,
    sourceDescription: seed.sourceDescription,
    collectedAt: isoDay(seed.collectedOffsetDays),
    integrityHash: demoHash(seed.n),
    linkedProcedureIds: procedureId ? [procedureId] : [],
    linkedFindingRefs: seed.linkedFindingRefs ?? seed.findingRefs ?? [],
    versionHistory: Array.from({ length: seed.version }, (_, i) => ({
      version: i + 1,
      at: isoDateTime(seed.uploadedOffsetDays - (seed.version - 1 - i) * 5, 13, 45),
      uploadedByName: seed.uploadedByName,
      note: i === 0 ? 'Initial upload (demo)' : `Revision ${i + 1} (demo)`,
    })),
    accessHistory: [
      { at: isoDateTime(seed.uploadedOffsetDays, 14, 0), byName: seed.uploadedByName, action: 'Viewed' },
      ...(seed.reviewerName
        ? [{ at: isoDateTime(seed.uploadedOffsetDays + 1, 9, 30), byName: seed.reviewerName, action: 'Reviewed' as const }]
        : []),
    ],
  }
}

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  ev({
    n: 1,
    title: 'Transaction monitoring rule inventory — Q3 2026 extract',
    fileName: 'meridian-tm-rule-inventory-q3-2026.xlsx',
    mimeType: 'application/vnd.ms-excel',
    sizeKb: 482,
    institutionId: INST_IDS.meridian,
    examinationRef: 'EXM-2026-014',
    procedure: { examRef: 'EXM-2026-014', code: 'AML-01' },
    domainName: 'AML/CFT',
    category: 'System report',
    confidentiality: 'Confidential',
    uploadedByName: 'Grace Mbeki (Meridian — institution portal)',
    uploadedOffsetDays: -13,
    version: 2,
    reviewStatus: 'Reviewed',
    reviewerName: 'Hauwa Sadiq',
    reviewerNote: 'v2 accepted: includes the four scenarios missing from the first extract. Supports the AML-01 Fail result. Demo review note.',
    sourceDescription: 'Provided via information request IR-2026-014 (institution portal upload, demo)',
    collectedOffsetDays: -14,
    linkedFindingRefs: ['FND-2026-101'],
  }),
  ev({
    n: 2,
    title: 'AML business-wide risk assessment 2026 (extract)',
    fileName: 'meridian-aml-risk-assessment-2026.pdf',
    mimeType: 'application/pdf',
    sizeKb: 2140,
    institutionId: INST_IDS.meridian,
    examinationRef: 'EXM-2026-014',
    procedure: { examRef: 'EXM-2026-014', code: 'AML-01' },
    domainName: 'AML/CFT',
    category: 'Policy document',
    confidentiality: 'Confidential',
    uploadedByName: 'Grace Mbeki (Meridian — institution portal)',
    uploadedOffsetDays: -12,
    version: 1,
    reviewStatus: 'Reviewed',
    reviewerName: 'Hauwa Sadiq',
    reviewerNote: '22 declared high-risk scenarios used as the coverage population for AML-01. Demo review note.',
    sourceDescription: 'Provided via information request IR-2026-014 (demo)',
    collectedOffsetDays: -20,
  }),
  ev({
    n: 3,
    title: 'Monitoring alert queue extract — Jan–Sep 2026',
    fileName: 'meridian-alert-queue-2026.csv',
    mimeType: 'text/csv',
    sizeKb: 96,
    institutionId: INST_IDS.meridian,
    examinationRef: 'EXM-2026-014',
    procedure: { examRef: 'EXM-2026-014', code: 'AML-02' },
    domainName: 'AML/CFT',
    category: 'System report',
    confidentiality: 'Restricted',
    uploadedByName: 'Ebenezer Kalu (Meridian — institution portal)',
    uploadedOffsetDays: -9,
    version: 1,
    reviewStatus: 'Pending Review',
    sourceDescription: 'Provided via information request IR-2026-014 (demo)',
    collectedOffsetDays: -10,
  }),
  ev({
    n: 4,
    title: 'CDD periodic refresh tracker by risk tier',
    fileName: 'meridian-cdd-refresh-tracker.xlsx',
    mimeType: 'application/vnd.ms-excel',
    sizeKb: 310,
    institutionId: INST_IDS.meridian,
    examinationRef: 'EXM-2026-014',
    procedure: { examRef: 'EXM-2026-014', code: 'AML-03' },
    findingRefs: ['FND-2026-107'],
    domainName: 'AML/CFT',
    category: 'System report',
    confidentiality: 'Confidential',
    uploadedByName: 'Grace Mbeki (Meridian — institution portal)',
    uploadedOffsetDays: -6,
    version: 1,
    reviewStatus: 'Reviewed',
    reviewerName: 'Nkechi Balogun',
    reviewerNote: 'Confirms the 2,300 high-risk customer backlog (demo figure) cited in FND-2026-107.',
    sourceDescription: 'Provided via information request IR-2026-014 (demo)',
    collectedOffsetDays: -7,
  }),
  ev({
    n: 5,
    title: 'Examiner working paper — AML-01 rule coverage mapping',
    fileName: 'exm-014-aml-01-working-paper.pdf',
    mimeType: 'application/pdf',
    sizeKb: 188,
    institutionId: INST_IDS.meridian,
    examinationRef: 'EXM-2026-014',
    procedure: { examRef: 'EXM-2026-014', code: 'AML-01' },
    findingRefs: ['FND-2026-101'],
    domainName: 'AML/CFT',
    category: 'Working paper',
    confidentiality: 'Internal',
    uploadedByName: 'Hauwa Sadiq',
    uploadedOffsetDays: -6,
    version: 1,
    reviewStatus: 'Reviewed',
    reviewerName: 'Chuka Eze',
    reviewerNote: 'Scenario-to-rule mapping re-performed; 4 uncovered scenarios documented. Supports the Fail result.',
    sourceDescription: 'Prepared by the examination team during fieldwork (demo)',
    collectedOffsetDays: -6,
  }),
  ev({
    n: 6,
    title: 'Delta credit file sampling pack — batch 1 of 3',
    fileName: 'delta-credit-files-batch1.zip',
    mimeType: 'application/zip',
    sizeKb: 5120,
    institutionId: INST_IDS.delta,
    examinationRef: 'EXM-2026-017',
    procedure: { examRef: 'EXM-2026-017', code: 'CRD-01' },
    domainName: 'Credit Risk',
    category: 'Sample population',
    confidentiality: 'Restricted',
    uploadedByName: 'Ngozi Emenike (Delta — institution portal)',
    uploadedOffsetDays: -4,
    version: 1,
    reviewStatus: 'Pending Review',
    sourceDescription: 'Provided via information request IR-2026-017 (demo) — first 10 of 25 files under review per My Work queue',
    collectedOffsetDays: -5,
  }),
  ev({
    n: 7,
    title: 'Third-party risk register — Q1 2026 snapshot',
    fileName: 'crestline-tpr-register-q1-2026.xlsx',
    mimeType: 'application/vnd.ms-excel',
    sizeKb: 275,
    institutionId: INST_IDS.crestline,
    examinationRef: 'EXM-2026-005',
    procedure: { examRef: 'EXM-2026-005', code: 'CYB-01' },
    findingRefs: ['FND-2026-066'],
    domainName: 'Cybersecurity',
    category: 'System report',
    confidentiality: 'Confidential',
    uploadedByName: 'Zara Nwosu (Crestline — institution portal)',
    uploadedOffsetDays: -246,
    version: 1,
    reviewStatus: 'Reviewed',
    reviewerName: 'Kwame Mensah',
    reviewerNote: 'Register predates the two Q2 2026 aggregator integrations — root evidence for FND-2026-066. Demo review note.',
    sourceDescription: 'Collected during EXM-2026-005 fieldwork (demo)',
    collectedOffsetDays: -250,
  }),
  ev({
    n: 8,
    title: 'CAP-2026-008 remediation evidence — updated register extract',
    fileName: 'crestline-tpr-register-updated.xlsx',
    mimeType: 'application/vnd.ms-excel',
    sizeKb: 292,
    institutionId: INST_IDS.crestline,
    findingRefs: ['FND-2026-066'],
    domainName: 'Cybersecurity',
    category: 'Remediation evidence',
    confidentiality: 'Confidential',
    uploadedByName: 'Zara Nwosu (Crestline — institution portal)',
    uploadedOffsetDays: -8,
    version: 3,
    reviewStatus: 'Pending Review',
    sourceDescription: 'Submitted against corrective action CAP-2026-008 (demo)',
    collectedOffsetDays: -9,
    linkedFindingRefs: ['FND-2026-066'],
  }),
  ev({
    n: 9,
    title: 'Vanguard capital restoration evidence — batch 2',
    fileName: 'vanguard-capital-restoration-batch2.zip',
    mimeType: 'application/zip',
    sizeKb: 8310,
    institutionId: INST_IDS.vanguard,
    findingRefs: ['FND-2026-030'],
    domainName: 'Capital Adequacy',
    category: 'Remediation evidence',
    confidentiality: 'Restricted',
    uploadedByName: 'Kunle Oyelowo (Vanguard — institution portal)',
    uploadedOffsetDays: -3,
    version: 1,
    reviewStatus: 'Pending Review',
    sourceDescription: 'Submitted against corrective action CAP-2026-007 (demo) — My Work critical review item',
    collectedOffsetDays: -4,
    linkedFindingRefs: ['FND-2026-030', 'FND-2026-037'],
  }),
  ev({
    n: 10,
    title: 'CAP-2026-003 remediation progress report (overdue)',
    fileName: 'meridian-cap-003-progress-report.pdf',
    mimeType: 'application/pdf',
    sizeKb: 740,
    institutionId: INST_IDS.meridian,
    findingRefs: ['FND-2026-101'],
    domainName: 'AML/CFT',
    category: 'Remediation evidence',
    confidentiality: 'Confidential',
    uploadedByName: 'Grace Mbeki (Meridian — institution portal)',
    uploadedOffsetDays: -16,
    version: 2,
    reviewStatus: 'Reviewed',
    reviewerName: 'Hauwa Sadiq',
    reviewerNote: 'Progress at 65% (demo) past the original due date; extension request pending in remediation workspace. Validation failed — monitoring gap persists per AML-01.',
    sourceDescription: 'Submitted against corrective action CAP-2026-003 (demo)',
    collectedOffsetDays: -17,
    linkedFindingRefs: ['FND-2026-101'],
  }),
  ev({
    n: 11,
    title: 'STR register extract — Jan–Sep 2026',
    fileName: 'meridian-str-register-2026.xlsx',
    mimeType: 'application/vnd.ms-excel',
    sizeKb: 154,
    institutionId: INST_IDS.meridian,
    examinationRef: 'EXM-2026-014',
    procedure: { examRef: 'EXM-2026-014', code: 'AML-05' },
    domainName: 'AML/CFT',
    category: 'System report',
    confidentiality: 'Restricted',
    uploadedByName: 'Ebenezer Kalu (Meridian — institution portal)',
    uploadedOffsetDays: -2,
    version: 1,
    reviewStatus: 'Pending Review',
    sourceDescription: 'Provided via information request IR-2026-014 (demo)',
    collectedOffsetDays: -3,
  }),
  ev({
    n: 12,
    title: 'Northstar daily LCR computation — alert window',
    fileName: 'northstar-lcr-daily-oct-2026.xlsx',
    mimeType: 'application/vnd.ms-excel',
    sizeKb: 208,
    institutionId: INST_IDS.northstar,
    examinationRef: 'EXM-2026-024',
    procedure: { examRef: 'EXM-2026-024', code: 'LIQ-01' },
    domainName: 'Liquidity Risk',
    category: 'System report',
    confidentiality: 'Confidential',
    uploadedByName: 'Ibrahim Sani (Northstar — institution portal)',
    uploadedOffsetDays: -1,
    version: 1,
    reviewStatus: 'Pending Review',
    sourceDescription: 'Provided via information request IR-2026-024 (demo)',
    collectedOffsetDays: -1,
  }),
]
