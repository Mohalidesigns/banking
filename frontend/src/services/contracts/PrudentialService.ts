import type { ActorContext } from '@/types/common'
import type {
  CapitalBreachRow,
  CapitalOverview,
  CapitalSubmissionRow,
  CreateStressRunInput,
  CreditOverview,
  InstitutionCapitalDetail,
  IndicatorDetail,
  LiquidityOverview,
  LoanSample,
  PrudentialIndicatorDefinition,
  PrudentialPeriodQuery,
  StressRun,
  StressScenario,
  TreasuryExaminerResult,
  TreasuryTransaction,
  UpdateIndicatorThresholdsInput,
} from '@/types/prudential'

/**
 * Prudential supervision contracts (Spec §8.1–§8.5, §18.3, Phase 3B).
 * Components consume these interfaces only; MockPrudentialService implements
 * them over `prudentialRepository` (+ institution/surveillance repositories
 * for snapshot-derived series), and a future ApiPrudentialService would slot
 * in without screen changes (Spec §18.6). Role gating per §19:
 * - `review-prudential` — start a capital submission review (analyst tier);
 * - `approve-prudential` — accept/reject capital submissions, move breach
 *   status, approve/reject stress runs (team lead and above);
 * - `record-fieldwork` — loan-sample conclusions and treasury examination
 *   results (examiner tier, mirrors §7 fieldwork gating);
 * - `run-stress-test` — create/submit stress runs;
 * - `manage-indicator-thresholds` — indicator catalogue threshold changes.
 * ALL figures served are illustrative demo data (Spec §17.5); stress
 * results are never official regulatory outcomes (Spec §8.4).
 */

export interface CapitalAdequacyService {
  /** §8.1 dashboard: KPIs, submissions, breaches, adjustments, trend, RWA. */
  overview(query?: PrudentialPeriodQuery): Promise<CapitalOverview>
  /** §8.1 institution detail (composition, trend, deductions, CAR detail). */
  institutionDetail(institutionId: string): Promise<InstitutionCapitalDetail | undefined>
  startSubmissionReview(id: string, actor: ActorContext): Promise<CapitalSubmissionRow | undefined>
  decideSubmission(
    id: string,
    decision: 'Accepted' | 'Rejected',
    note: string,
    actor: ActorContext,
  ): Promise<CapitalSubmissionRow | undefined>
  setBreachStatus(
    id: string,
    status: CapitalBreachRow['status'],
    note: string,
    actor: ActorContext,
  ): Promise<CapitalBreachRow | undefined>
}

export interface CreditQualityService {
  /** §8.2: KPIs + all portfolio tables/charts, optionally filtered to one institution. */
  overview(query?: PrudentialPeriodQuery): Promise<CreditOverview>
  listLoanSamples(query?: PrudentialPeriodQuery): Promise<LoanSample[]>
  concludeLoanSample(
    id: string,
    conclusion: NonNullable<LoanSample['examinerConclusion']>,
    note: string,
    actor: ActorContext,
  ): Promise<LoanSample | undefined>
}

export interface LiquidityTreasuryService {
  /** §8.3: KPIs, trend, funding maturity, liquid assets, deposits, FX, exceptions. */
  overview(query?: PrudentialPeriodQuery): Promise<LiquidityOverview>
  listTreasuryTransactions(query?: PrudentialPeriodQuery): Promise<TreasuryTransaction[]>
  recordExaminerResult(
    id: string,
    result: TreasuryExaminerResult,
    note: string,
    actor: ActorContext,
  ): Promise<TreasuryTransaction | undefined>
}

export interface StressTestingService {
  /** §8.4 scenario library with assumptions (illustrative demo scenarios). */
  listScenarios(): Promise<StressScenario[]>
  getScenario(id: string): Promise<StressScenario | undefined>
  listRuns(): Promise<StressRun[]>
  getRun(id: string): Promise<StressRun | undefined>
  createRun(input: CreateStressRunInput, actor: ActorContext): Promise<StressRun | undefined>
  submitRun(id: string, actor: ActorContext): Promise<StressRun | undefined>
  reviewRun(
    id: string,
    decision: 'Approved' | 'Rejected',
    note: string,
    actor: ActorContext,
  ): Promise<StressRun | undefined>
}

export interface IndicatorCatalogueService {
  /** §8.5 configurable catalogue. */
  listDefinitions(): Promise<PrudentialIndicatorDefinition[]>
  /** Detail with formula breakdown, historical values and threshold history. */
  detail(codeOrId: string, query?: PrudentialPeriodQuery): Promise<IndicatorDetail | undefined>
  updateThresholds(
    id: string,
    input: UpdateIndicatorThresholdsInput,
    actor: ActorContext,
  ): Promise<PrudentialIndicatorDefinition | undefined>
}
