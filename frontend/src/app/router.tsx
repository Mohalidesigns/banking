import { createBrowserRouter, Navigate } from 'react-router'
import { ModulePlaceholder } from '@/components/navigation/ModulePlaceholder'
import { CommandCentrePage } from '@/features/dashboard/CommandCentrePage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { MyWorkPage } from '@/features/work/MyWorkPage'
import { InstitutionRegistryPage } from '@/features/institutions/InstitutionRegistryPage'
import { InstitutionProfilePage } from '@/features/institutions/InstitutionProfilePage'
import { InstitutionGroupsPage } from '@/features/institutions/InstitutionGroupsPage'
import { BranchNetworkPage } from '@/features/institutions/BranchNetworkPage'
import { DirectorsPage } from '@/features/institutions/DirectorsPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { PortalLoginPage } from '@/features/auth/PortalLoginPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { RiskAssessmentDetailPage } from '@/features/risk/RiskAssessmentDetailPage'
import { RiskAssessmentsPage } from '@/features/risk/RiskAssessmentsPage'
import { RiskAssessmentWizardPage } from '@/features/risk/RiskAssessmentWizardPage'
import { RiskBasedSupervisionPage } from '@/features/risk/RiskBasedSupervisionPage'
import { PlanDetailPage } from '@/features/plans/PlanDetailPage'
import { PlanWizardPage } from '@/features/plans/PlanWizardPage'
import { SupervisoryPlansPage } from '@/features/plans/SupervisoryPlansPage'
import { CreateExaminationPage } from '@/features/examinations/CreateExaminationPage'
import { ExaminationRegisterPage } from '@/features/examinations/ExaminationRegisterPage'
import { AuthLayout } from '@/layouts/AuthLayout'
import { InstitutionPortalLayout } from '@/layouts/InstitutionPortalLayout'
import { RegulatorLayout } from '@/layouts/RegulatorLayout'
import type { RouteHandle } from '@/app/handle'

/**
 * Every Spec §4 route is registered, plus routes for sidebar-only items so
 * navigation has no dead ends. `handle` metadata drives the topbar title,
 * breadcrumbs and placeholder phase labels. Unimplemented modules render the
 * shared designed placeholder; each phase replaces its own routes' elements.
 */
const moduleRoute = (breadcrumb: string, phase: number) => ({
  handle: { breadcrumb, phase } satisfies RouteHandle,
  Component: ModulePlaceholder,
})

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app/dashboard" replace /> },

  // Auth
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  { path: '/portal/login', element: <PortalLoginPage /> },

  // Regulator workspace
  {
    path: '/app',
    element: <RegulatorLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: 'dashboard',
        handle: { breadcrumb: 'Command Centre', phase: 2 } satisfies RouteHandle,
        Component: CommandCentrePage,
      },
      {
        path: 'my-work',
        handle: { breadcrumb: 'My Work', phase: 2 } satisfies RouteHandle,
        Component: MyWorkPage,
      },
      { path: 'notifications', ...moduleRoute('Notifications', 6) },

      // Institution management
      {
        path: 'institutions',
        handle: { breadcrumb: 'Institution Registry', phase: 2 } satisfies RouteHandle,
        Component: InstitutionRegistryPage,
      },
      {
        path: 'institutions/:institutionId',
        handle: { breadcrumb: 'Institution Profile', phase: 2 } satisfies RouteHandle,
        Component: InstitutionProfilePage,
      },
      {
        path: 'institutions/:institutionId/financials',
        handle: { breadcrumb: 'Financial Profile', phase: 2 } satisfies RouteHandle,
        Component: InstitutionProfilePage,
      },
      {
        path: 'institutions/:institutionId/risk',
        handle: { breadcrumb: 'Institution Risk Profile', phase: 2 } satisfies RouteHandle,
        Component: InstitutionProfilePage,
      },
      {
        path: 'institutions/:institutionId/examinations',
        handle: { breadcrumb: 'Examination History', phase: 2 } satisfies RouteHandle,
        Component: InstitutionProfilePage,
      },
      {
        path: 'institution-groups',
        handle: { breadcrumb: 'Institution Groups', phase: 2 } satisfies RouteHandle,
        Component: InstitutionGroupsPage,
      },
      {
        path: 'branch-network',
        handle: { breadcrumb: 'Branch Network', phase: 2 } satisfies RouteHandle,
        Component: BranchNetworkPage,
      },
      {
        path: 'directors',
        handle: { breadcrumb: 'Directors & Key Officers', phase: 2 } satisfies RouteHandle,
        Component: DirectorsPage,
      },

      // Surveillance & risk
      { path: 'surveillance', ...moduleRoute('Off-Site Surveillance', 3) },
      {
        path: 'risk-based-supervision',
        handle: { breadcrumb: 'Risk-Based Supervision', phase: 2 } satisfies RouteHandle,
        Component: RiskBasedSupervisionPage,
      },
      {
        path: 'risk-assessments',
        handle: { breadcrumb: 'Risk Assessments', phase: 2 } satisfies RouteHandle,
        Component: RiskAssessmentsPage,
      },
      {
        path: 'risk-assessments/new',
        handle: { breadcrumb: 'New Risk Assessment', phase: 2 } satisfies RouteHandle,
        Component: RiskAssessmentWizardPage,
      },
      {
        path: 'risk-assessments/:assessmentId',
        handle: { breadcrumb: 'Risk Assessment Detail', phase: 2 } satisfies RouteHandle,
        Component: RiskAssessmentDetailPage,
      },
      { path: 'early-warnings', ...moduleRoute('Early Warning Alerts', 3) },
      {
        path: 'supervisory-plans',
        handle: { breadcrumb: 'Supervisory Plans', phase: 2 } satisfies RouteHandle,
        Component: SupervisoryPlansPage,
      },
      {
        path: 'supervisory-plans/new',
        handle: { breadcrumb: 'New Supervisory Plan', phase: 2 } satisfies RouteHandle,
        Component: PlanWizardPage,
      },
      {
        path: 'supervisory-plans/:planId',
        handle: { breadcrumb: 'Plan Detail', phase: 2 } satisfies RouteHandle,
        Component: PlanDetailPage,
      },

      // Examination operations
      {
        path: 'examinations',
        handle: { breadcrumb: 'Examination Register', phase: 2 } satisfies RouteHandle,
        Component: ExaminationRegisterPage,
      },
      {
        path: 'examinations/new',
        handle: { breadcrumb: 'Create Examination', phase: 2 } satisfies RouteHandle,
        Component: CreateExaminationPage,
      },
      { path: 'examinations/:examinationId', ...moduleRoute('Examination Detail', 2) },
      { path: 'examinations/:examinationId/workspace', ...moduleRoute('Fieldwork Workspace', 2) },
      { path: 'examination-calendar', ...moduleRoute('Examination Calendar', 2) },
      { path: 'examination-programmes', ...moduleRoute('Examination Programmes', 2) },
      { path: 'fieldwork', ...moduleRoute('Fieldwork Workspace', 2) },
      { path: 'examination-library', ...moduleRoute('Examination Library', 2) },
      { path: 'evidence', ...moduleRoute('Evidence Repository', 2) },
      { path: 'findings', ...moduleRoute('Supervisory Findings', 2) },
      { path: 'findings/:findingId', ...moduleRoute('Finding Detail', 2) },
      { path: 'remediation', ...moduleRoute('Follow-Up & Remediation', 2) },

      // Prudential supervision
      { path: 'prudential/capital', ...moduleRoute('Capital Adequacy', 3) },
      { path: 'prudential/credit', ...moduleRoute('Credit & Asset Quality', 3) },
      { path: 'prudential/liquidity', ...moduleRoute('Liquidity & Treasury', 3) },
      { path: 'prudential/stress-testing', ...moduleRoute('Stress Testing', 3) },
      { path: 'prudential/indicators', ...moduleRoute('Prudential Indicators', 3) },

      // Specialist supervision
      { path: 'specialist/governance', ...moduleRoute('Corporate Governance', 4) },
      { path: 'specialist/erm', ...moduleRoute('Enterprise Risk Management', 4) },
      { path: 'specialist/cybersecurity', ...moduleRoute('IT & Cybersecurity', 4) },
      { path: 'specialist/aml', ...moduleRoute('AML/CFT/CPF', 4) },
      { path: 'specialist/operations', ...moduleRoute('Operations & Internal Controls', 4) },
      { path: 'specialist/consumer-protection', ...moduleRoute('Consumer Protection', 4) },

      // Regulatory administration
      { path: 'regulatory/frameworks', ...moduleRoute('Regulatory Frameworks', 4) },
      { path: 'regulatory/obligations', ...moduleRoute('Regulatory Obligations', 4) },
      { path: 'regulatory/correspondence', ...moduleRoute('Regulatory Correspondence', 4) },
      { path: 'returns', ...moduleRoute('Regulatory Returns', 3) },
      { path: 'returns/:submissionId', ...moduleRoute('Submission Detail', 3) },
      { path: 'submission-monitoring', ...moduleRoute('Submission Monitoring', 3) },

      // Supervisory action
      { path: 'enforcement', ...moduleRoute('Enforcement Cases', 5) },
      { path: 'enforcement/:caseId', ...moduleRoute('Enforcement Case Detail', 5) },
      { path: 'directives', ...moduleRoute('Supervisory Directives', 5) },
      { path: 'sanctions', ...moduleRoute('Sanctions & Penalties', 5) },
      { path: 'corrective-action-plans', ...moduleRoute('Corrective Action Plans', 5) },

      // Intelligence & reporting
      { path: 'reports', ...moduleRoute('Supervisory Reports', 5) },
      { path: 'intelligence', ...moduleRoute('Industry Intelligence', 5) },
      { path: 'peer-benchmarking', ...moduleRoute('Peer Benchmarking', 5) },
      { path: 'systemic-risk', ...moduleRoute('Systemic Risk', 5) },
      { path: 'ai-assistant', ...moduleRoute('AI Supervisory Assistant', 5) },

      // Administration
      { path: 'admin/users', ...moduleRoute('User Management', 6) },
      { path: 'admin/users/:userId', ...moduleRoute('User Detail', 6) },
      { path: 'admin/roles', ...moduleRoute('Roles & Permissions', 6) },
      { path: 'admin/permissions', ...moduleRoute('Permissions Management', 6) },
      { path: 'admin/teams', ...moduleRoute('Teams & Departments', 6) },
      { path: 'admin/workflows', ...moduleRoute('Workflow Configuration', 6) },
      { path: 'admin/jurisdictions', ...moduleRoute('Jurisdiction Configuration', 6) },
      { path: 'admin/institution-categories', ...moduleRoute('Institution Categories', 6) },
      { path: 'admin/notification-settings', ...moduleRoute('Notification Settings', 6) },
      { path: 'admin/audit-trail', ...moduleRoute('Audit Trail', 6) },
      { path: 'admin/settings', ...moduleRoute('System Settings', 6) },
      { path: 'profile', ...moduleRoute('My Profile', 6) },
    ],
  },

  // Institution portal
  {
    path: '/portal',
    element: <InstitutionPortalLayout />,
    children: [
      { index: true, element: <Navigate to="/portal/dashboard" replace /> },
      { path: 'dashboard', ...moduleRoute('Institution Dashboard', 6) },
      { path: 'returns', ...moduleRoute('Regulatory Returns', 6) },
      { path: 'requests', ...moduleRoute('Information Requests', 6) },
      { path: 'examination-notices', ...moduleRoute('Examination Notices', 6) },
      { path: 'remediation', ...moduleRoute('Remediation & Findings', 6) },
      { path: 'directives', ...moduleRoute('Directives & Correspondence', 6) },
      { path: 'messages', ...moduleRoute('Messages', 6) },
      { path: 'documents', ...moduleRoute('Documents', 6) },
      { path: 'users', ...moduleRoute('Organisation Users', 6) },
      { path: 'profile', ...moduleRoute('Profile', 6) },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])

