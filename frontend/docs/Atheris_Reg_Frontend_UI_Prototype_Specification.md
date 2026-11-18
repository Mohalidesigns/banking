# Atheris Reg --- Complete Frontend UI Prototype Specification

**Document:** UI/UX and Frontend Prototype Build Specification\
**Product:** Atheris Reg --- Banking Supervision & Regulatory
Intelligence\
**Owner:** Atheris Limited\
**Version:** 1.0\
**Date:** 18 November 2026\
**Implementation stage:** Frontend prototype first; backend
implementation follows\
**Frontend stack:** React JS / TypeScript recommended\
**Future backend:** Java Spring Boot\
**Future database:** PostgreSQL\
**Design reference:** `thirdLine_Design_System.md` (uploaded reference,
Version 2.0, 8 April 2026)

------------------------------------------------------------------------

## 1. Purpose and implementation mandate

This document is the single implementation brief for the complete
Atheris Reg frontend prototype. Build the user experience across all
product modules before implementing backend services, database
persistence, or production authentication.

Atheris Reg is a standalone regulatory supervision platform for central
banks and other authorised financial-sector supervisory authorities. It
is not an internal audit product. Its core workflows concern supervised
institutions, regulatory returns, off-site surveillance, risk-based
supervision, on-site examinations, prudential analysis, supervisory
findings, enforcement and industry intelligence.

### 1.1 Prototype-first rules

1.  Build the complete navigable frontend using realistic mock data.
2.  All screens must be accessible through the application navigation
    and contextual links.
3.  All visible buttons, tabs, filters, menus, forms, drawers, modals,
    table actions and workflow controls must have a meaningful prototype
    interaction.
4.  Use local React state and a mock data/service layer. Do not call a
    real backend.
5.  Do not create fake claims of persistence, delivery, regulatory
    submission, approval or enforcement. Show clear prototype feedback
    such as "Saved in prototype session" or "Demo action completed".
6.  Keep mock data in dedicated fixtures and services, not embedded
    throughout page components.
7.  Build components and data contracts so the future Spring Boot API
    can replace mock services without redesigning screens.
8.  Include loading, empty, error, permission-denied, validation and
    success states.
9.  Implement responsive desktop, tablet and mobile behaviour.
10. Include regulator-side access management and a restricted
    supervised-institution portal prototype.
11. The prototype is not a production security boundary. Role switching
    is for demonstration only; backend authorisation must be implemented
    and tested later.

### 1.2 Product positioning

**Product name:** Atheris Reg\
**Descriptor:** Banking Supervision & Regulatory Intelligence\
**Tagline:** Regulatory Oversight. Institutional Resilience.

The product should feel authoritative, precise, secure and suitable for
a central bank or statutory supervisory authority.

------------------------------------------------------------------------

## 2. Design system inheritance from thirdLine

The uploaded thirdLine design system is the visual source of truth.
Reuse its visual language and component behaviour, adapted to the
regulatory supervision domain. Do not introduce a new visual theme.

### 2.1 Brand adaptation

-   Replace all thirdLine/AuditPro product names with **Atheris Reg**.
-   Use the established 36×36px rounded-square logo container with gold
    gradient `#D4AF37` to `#B8962E`.
-   Use a white shield/authority-oriented glyph inside the logo
    container. A regulatory building or shield may be used if available
    in the icon set.
-   Product name: Atheris Reg, 16px / 700 / white.
-   Subtitle: `BANKING SUPERVISION` in 10px / 500 / gold with 1px letter
    spacing.
-   Do not use thirdLine, AuditPro GRC or "Internal Audit" in the
    product UI except in internal design-reference documentation.

### 2.2 Colour tokens

Use these exact inherited tokens unless a documented accessibility test
requires adjustment.

  Token             Value       Usage
  ----------------- ----------- ---------------------------------------
  Primary           `#1A365D`   Sidebar, headings, primary buttons
  Primary light     `#2A4A7F`   Hover states
  Primary dark      `#0F2340`   Pressed/deep backgrounds
  Primary surface   `#2D5F9A`   Secondary blue
  Accent            `#D4AF37`   Active navigation, premium/AI accents
  Accent light      `#E2C458`   Accent hover
  Accent dark       `#B8962E`   Logo gradient
  Success           `#2D7D46`   Compliant, approved, positive
  Warning           `#DD6B20`   Warning, high risk, pending fieldwork
  Error             `#C53030`   Critical, overdue, rejected
  Info              `#319795`   Informational
  Purple            `#6B46C1`   Reporting and specialist status
  Yellow            `#B7791F`   Medium risk
  Page background   `#F7FAFC`   Main application background
  Card              `#FFFFFF`   Cards and dialogs
  Text primary      `#2D3748`   Body text
  Text secondary    `#718096`   Labels and captions
  Text tertiary     `#A0AEC0`   Placeholders and disabled
  Border            `#E2E8F0`   Card/input/table borders
  Light border      `#F0F0F0`   Subtle dividers

Tint pairs: - Blue: background `#EBF4FF`, text `#1A365D`. - Green:
background `#F0FFF4`, text `#2D7D46`. - Orange: background `#FFFAF0`,
text `#DD6B20`. - Red: background `#FFF5F5`, text `#C53030`. - Purple:
background `#FAF5FF`, text `#6B46C1`. - Yellow: background `#FFFFF0`,
text `#B7791F`.

Risk heat map: - Very low: `#48BB78` (1--4). - Low: `#ECC94B` (5--9). -
Medium: `#ED8936` (10--14). - High: `#E53E3E` (15--19). - Critical:
`#9B2C2C` (20--25).

Semantic colours must never be decorative. Do not use red except for
error/critical states, green for success/compliance, or orange for
warnings.

### 2.3 Typography

-   Primary font: Inter, weights 300--800.
-   Fallback: system-ui, -apple-system, sans-serif.
-   Monospace: Roboto Mono for IDs, technical references and code-like
    values.
-   Page title: 20px / 700 / navy.
-   Section title: 14px / 600 / navy.
-   KPI value: 28px / 700 / navy.
-   Body: 13px / 400.
-   Secondary descriptions: 12px.
-   Labels: 12px / 500.
-   Captions: 11px.
-   Sidebar section labels: 10px uppercase, 600, 1.5px tracking.
-   Sidebar items: 13px.
-   Badges: 9--11px / 600.
-   Default line height 1.5--1.6; headings 1.2.

### 2.4 Spacing, dimensions and elevation

Use a 4px base spacing unit.

  Token     Value
  ------- -------
  xs          4px
  sm          8px
  md         12px
  base       16px
  lg         20px
  xl         24px
  2xl        32px

-   Sidebar: 250px expanded; 72px collapsed.
-   Topbar: approximately 56px.
-   Main content: 24px vertical and 32px horizontal padding on desktop.
-   Card grid gap: 16px.
-   Section grid gap: 20px.
-   Card radius: 12px.
-   Inputs/buttons: 8px radius.
-   KPI icon container: 40×40px, 10px radius.
-   Card border: `1px solid #E2E8F0`.
-   Card shadow: `0 1px 3px rgba(0,0,0,0.08)`.
-   Hover shadow: `0 4px 12px rgba(0,0,0,0.12)`.
-   Card hover lift: translateY(-2px), 200ms.

### 2.5 Shared component standards

Implement reusable components matching the source design system:

-   AppShell, Sidebar, Topbar, Breadcrumbs, PageHeader.
-   PrimaryButton, OutlineButton, DangerButton, SuccessButton,
    WarningButton, AIButton.
-   Card, CardHeader, StatCard/KPICard, FrameworkCard.
-   StatusBadge, RiskBadge, ComplianceBadge, RiskTypeChip.
-   DataTable with sorting, pagination, row selection and column
    actions.
-   FilterBar, SearchInput, DateRangeFilter, SelectFilter, MultiSelect.
-   TextInput, TextArea, Select, DatePicker, Checkbox, RadioGroup,
    Toggle.
-   Modal, ConfirmDialog, Drawer, DropdownMenu, Tabs, Tooltip.
-   Toast/NotificationStack, EmptyState, LoadingSkeleton, ErrorState.
-   ProgressBar, ProgressRing, DonutChart, HeatMap.
-   FileUpload, EvidenceViewer, Timeline, ActivityFeed.
-   Stepper, ApprovalTrail, WorkflowStatus, CommentThread.
-   AIInsightCard, AIStatusIndicator, AIRecommendationPanel.
-   GlobalSearch, NotificationPanel, UserAvatar, UserMenu.

All icon-only controls require accessible labels. Use one consistent
icon family in the prototype (Lucide or the project's agreed SVG set);
do not mix inconsistent icon styles.

### 2.6 Layout and responsive behaviour

-   Desktop ≥1280px: full sidebar and dense data layouts.
-   Tablet 768--1023px: sidebar collapses to icon rail; grids reduce
    columns.
-   Mobile \<768px: sidebar becomes a drawer; topbar has menu trigger;
    cards stack; tables become horizontally scrollable or compact record
    cards.
-   At \<1024px, chart grids stack vertically.
-   KPI grids: four columns desktop, two tablet, one mobile.
-   Keep primary page actions visible and avoid horizontal overflow in
    forms.
-   Tables may scroll horizontally, but action controls must remain
    reachable.

### 2.7 Accessibility

Target WCAG 2.1 AA at minimum (WCAG 2.2 AA preferred): - Keyboard
navigation for all controls. - Visible focus ring. - Correct heading
hierarchy. - Labels and descriptions for form controls. - Dialog focus
management and Escape handling. - Colour is never the only status
indicator. - Adequate contrast and reduced-motion support. - Accessible
chart summaries and table alternatives. - Meaningful empty and error
states.

------------------------------------------------------------------------

## 3. Application shell and global navigation

### 3.1 Application shell

Every authenticated regulator page uses: 1. Left navigation sidebar. 2.
Topbar. 3. Main page content. 4. Optional contextual right drawer. 5.
Global notification/toast layer.

### 3.2 Sidebar structure

Use grouped, collapsible navigation sections. The active item uses a 3px
gold left border and white text on a translucent white background.

**OVERVIEW** - Supervisory Command Centre - My Work - Notifications

**INSTITUTION MANAGEMENT** - Institution Registry - Institution Groups -
Branch Network - Directors & Key Officers

**SURVEILLANCE & RISK** - Off-Site Surveillance - Risk-Based
Supervision - Risk Assessments - Early Warning Alerts - Supervisory
Plans

**EXAMINATION OPERATIONS** - Examination Register - Examination
Calendar - Examination Programmes - Fieldwork Workspace - Evidence
Repository - Supervisory Findings - Follow-Up & Remediation

**PRUDENTIAL SUPERVISION** - Capital Adequacy - Credit & Asset Quality -
Liquidity & Treasury - Prudential Indicators - Stress Testing

**SPECIALIST SUPERVISION** - Corporate Governance - Enterprise Risk
Management - IT & Cybersecurity - AML/CFT/CPF - Operations & Internal
Controls - Consumer Protection

**REGULATORY ADMINISTRATION** - Regulatory Frameworks - Regulatory
Obligations - Regulatory Returns - Submission Monitoring - Regulatory
Correspondence

**SUPERVISORY ACTION** - Enforcement Cases - Supervisory Directives -
Sanctions & Penalties - Corrective Action Plans

**INTELLIGENCE & REPORTING** - Supervisory Reports - Industry
Intelligence - Peer Benchmarking - Systemic Risk - AI Supervisory
Assistant

**ADMINISTRATION** - User Management - Roles & Permissions - Teams &
Departments - Workflow Configuration - Examination Library -
Jurisdiction Configuration - Institution Categories - Notification
Settings - Audit Trail - System Settings

Sidebar rules: - Each item routes to a real prototype page. - Show
counts for actionable queues where useful (e.g. overdue actions, pending
reviews). - Collapse groups independently. - Remember expanded/collapsed
state within the current prototype session. - Collapsed sidebar shows
tooltips. - Mobile navigation is an overlay drawer.

### 3.3 Topbar

Left: - Sidebar toggle. - Page title and breadcrumb.

Right: - Global search (institutions, examinations, findings, returns,
directives). - Jurisdiction/authority context selector where user has
multiple authorised contexts. - Help icon. - Notification bell with
unread count. - User avatar and dropdown.

User dropdown: - My Profile - My Preferences - Security & Sessions
(prototype view) - Switch Demo Role (prototype-only, clearly labelled) -
Sign Out (returns to prototype sign-in screen)

### 3.4 Global search

Build an interactive command/search overlay: - Search input with
keyboard shortcut hint. - Recent searches. - Group results by
Institutions, Examinations, Findings, Returns, Directives and Reports. -
Selecting a result navigates to its detail page. - No result state and
clear-search action. - Mock results only.

------------------------------------------------------------------------

## 4. Prototype routes and page inventory

Use route-based navigation. Suggested route pattern:

``` text
/login
/portal/login
/app/dashboard
/app/my-work
/app/institutions
/app/institutions/:institutionId
/app/institutions/:institutionId/financials
/app/institutions/:institutionId/risk
/app/institutions/:institutionId/examinations
/app/surveillance
/app/risk-assessments
/app/supervisory-plans
/app/early-warnings
/app/examinations
/app/examinations/new
/app/examinations/:examinationId
/app/examinations/:examinationId/workspace
/app/examination-library
/app/evidence
/app/findings
/app/findings/:findingId
/app/remediation
/app/prudential/capital
/app/prudential/credit
/app/prudential/liquidity
/app/prudential/stress-testing
/app/specialist/governance
/app/specialist/erm
/app/specialist/cybersecurity
/app/specialist/aml
/app/specialist/operations
/app/specialist/consumer-protection
/app/regulatory/frameworks
/app/regulatory/obligations
/app/returns
/app/returns/:submissionId
/app/enforcement
/app/enforcement/:caseId
/app/reports
/app/intelligence
/app/peer-benchmarking
/app/ai-assistant
/app/admin/users
/app/admin/users/:userId
/app/admin/roles
/app/admin/permissions
/app/admin/teams
/app/admin/workflows
/app/admin/jurisdictions
/app/admin/institution-categories
/app/admin/audit-trail
/app/admin/settings
/app/profile
/portal/dashboard
/portal/returns
/portal/requests
/portal/remediation
/portal/messages
/portal/profile
```

Every route must render a complete page, not a blank placeholder. If a
page is not yet deeply implemented, show a designed module landing page
with summary, key actions, data table or next-step cards.

------------------------------------------------------------------------

## 5. Screen-by-screen requirements

## 5.1 Authentication and entry screens

### A. Regulator sign-in --- `/login`

Layout: - Split-screen or centered sign-in card using navy and gold
brand. - Atheris Reg logo and Banking Supervision subtitle. -
Email/username. - Password with show/hide. - Remember device checkbox
(visual prototype only). - Sign in button. - Forgot password link. -
Optional SSO button. - Security/confidentiality footer.

Interactions: - Validate required fields. - Demo credentials or "Enter
prototype" control. - Show loading and error state. - Successful demo
sign-in routes to dashboard. - Do not imply real authentication.

### B. Institution portal sign-in --- `/portal/login`

Separate visual entry for supervised institutions: - Atheris Reg
Institution Portal branding. - Institution code. - Authorised user
email. - Password. - Sign in. - Help/contact information. - Portal
access notice.

The institution portal must be visually and functionally separated from
regulator workspaces.

### C. Forgot/reset password prototype

-   Email field.
-   Submit confirmation.
-   Reset password form with password rules and confirmation.
-   Simulated success state only.

------------------------------------------------------------------------

## 5.2 Supervisory Command Centre --- `/app/dashboard`

Purpose: executive overview for directors, deputy directors and
supervisory management.

Page header: - "Supervisory Command Centre" - Subtitle showing selected
regulator/jurisdiction and reporting date. - Period selector. - Export
dashboard action. - Refresh demo data action.

KPI cards: 1. Supervised Institutions. 2. High/Critical Risk
Institutions. 3. Examinations In Progress. 4. Outstanding Supervisory
Actions. 5. Overdue Regulatory Returns (optional fifth KPI row).

Charts and panels: - Institutional risk distribution donut. -
Supervisory portfolio by institution category. - Prudential trend chart:
capital, NPL and liquidity. - Examination plan execution progress. -
Early warning alerts queue. - High-priority supervisory findings. -
Upcoming examinations and regulatory deadlines. - Recent supervisory
activity timeline. - Institution watchlist.

Interactions: - KPI cards navigate to filtered lists. - Chart segments
filter or navigate. - Alert opens alert detail drawer. - Institution row
opens institution profile. - Period selector changes mock
values/charts. - Export produces a prototype CSV or printable view if
implemented.

Use clearly labelled illustrative/demo figures. Never present prototype
metrics as actual CBN statistics.

## 5.3 My Work --- `/app/my-work`

Personal work queue: - Assigned examinations. - Procedures awaiting
execution. - Evidence awaiting review. - Findings awaiting review. -
Management responses to assess. - Reports awaiting approval. -
Corrective actions awaiting validation. - Due today, upcoming and
overdue sections.

Filters: - Work type. - Priority. - Due date. - Status. - Institution.

Actions: - Open work item. - Mark task in progress/completed in local
state. - Reassign (if role permits in demo). - Add note.

## 5.4 Institution Registry --- `/app/institutions`

Institution list with: - Institution name/code. - Licence number. -
Category. - Jurisdiction. - Supervisory team. - Overall supervisory
rating. - Licence status. - Last examination. - Open findings. -
Portfolio status.

Controls: - Search. - Filters: category, status, risk rating, team,
region. - Sortable/paginated table. - Add institution. - Import
institutions (mock upload). - Export. - Row menu: view, edit, assign
team, view history.

### Institution creation/edit form

Sections: 1. Legal identity: legal name, trading name, institution code,
registration number, licence number. 2. Classification: institution
category, licence type, legal form, ownership type. 3. Jurisdiction:
country, regulator, currency, region. 4. Dates: incorporation, licence
issue, commencement. 5. Contacts: registered address, website, official
contact, regulatory liaison. 6. Supervisory assignment: department,
portfolio, lead supervisor, team. 7. Status and notes.

Validation: - Required identity fields. - Unique institution code within
regulator. - Valid date ordering. - Required licence category. - Confirm
before leaving with unsaved changes.

## 5.5 Institution profile --- `/app/institutions/:institutionId`

Use a detailed institution workspace with header and tabs.

Header: - Legal name, institution code and licence. - Institution
category. - Licence and supervisory status badges. - Overall risk
rating. - Lead supervisor. - Quick actions: request information, create
examination, add note, export profile.

Tabs: 1. Overview. 2. Corporate Profile. 3. Ownership & Group. 4. Board
& Management. 5. Financial Performance. 6. Prudential Indicators. 7.
Risk Profile. 8. Examinations. 9. Regulatory Returns. 10. Findings &
Remediation. 11. Enforcement. 12. Documents. 13. Activity History.

Overview content: - Institution KPI cards. - Risk profile summary. -
CAMELS or configured rating dimensions. - Financial trend charts. - Open
findings. - Latest returns. - Recent examinations. - Early warning
alerts. - Supervisory actions.

Ownership: - Shareholders, ownership percentage, beneficial owner,
related entities. - Relationship graph placeholder or visual hierarchy.

Board: - Director register, role, appointment date, committee
memberships, fit-and-proper status.

Documents: - Categorised document list, version, uploaded date,
uploader, confidentiality label.

## 5.6 Institution Groups and Branch Network

Institution Groups: - Group name, group identifier, parent entity,
subsidiaries, jurisdiction, consolidated supervision status. - Group
structure diagram. - Group-level exposure and risk summary. - Add/edit
relationship interactions.

Branch Network: - Branch name/code, institution, address, region, branch
type, operational status, risk classification, last visit. - Filters by
institution, region and status. - Branch detail drawer. - Branch
examination history.

Directors & Key Officers: - Person register, institution, position,
appointment, fit-and-proper status, approval status, conflict
declarations. - Profile detail page/drawer. - Appointment and status
history.

------------------------------------------------------------------------

## 6. Surveillance and risk-based supervision screens

## 6.1 Off-Site Surveillance --- `/app/surveillance`

Purpose: continuous review of institutional financial and prudential
condition.

Dashboard: - Institutions monitored. - Breaches detected. - New
alerts. - Returns awaiting validation. - Deteriorating institutions.

Main sections: - Surveillance overview. - Financial trend charts. -
Prudential exception table. - Institution watchlist. - Peer
comparisons. - Alerts and analyst notes.

Filters: - Institution/category. - Reporting period. - Indicator. -
Severity. - Alert status.

Actions: - Open institution surveillance. - Create analyst review. -
Escalate alert. - Request clarification. - Initiate targeted
examination.

### Surveillance detail

-   Institution and reporting period.
-   Submitted source data.
-   Calculated ratios and definitions.
-   Trend comparison.
-   Peer benchmark.
-   Threshold configuration reference.
-   Exceptions.
-   Analyst assessment.
-   Supervisory decision and action history.

## 6.2 Risk-Based Supervision --- `/app/risk-assessments`

Risk assessment list: - Institution. - Assessment reference. -
Methodology/version. - Assessment date. - Overall inherent risk. -
Control effectiveness. - Residual risk. - Reviewer. - Status.

Create assessment wizard: 1. Select institution and assessment period.
2. Select approved methodology/version. 3. Assess risk categories. 4.
Record inherent risk and evidence. 5. Assess control effectiveness. 6.
Determine residual risk using configured methodology. 7. Record
supervisory judgement and overrides. 8. Review and submit for approval.

Assessment detail: - Risk heat map. - Category scores. - Risk
narratives. - Supporting evidence. - Prior-period comparison. - Reviewer
comments. - Approval trail. - Recommended supervisory intensity.

Do not hardcode a universal regulatory rating formula. Show methodology
name/version and explain demo scoring.

## 6.3 Supervisory Plans --- `/app/supervisory-plans`

-   Annual, quarterly and event-driven plans.
-   Calendar and list views.
-   Institution coverage.
-   Planned supervisory activity.
-   Risk priority.
-   Responsible team.
-   Estimated effort.
-   Start/end dates.
-   Status and execution progress.

Plan creation: 1. Select planning cycle. 2. Select institutions or
portfolio. 3. Add supervisory activities. 4. Assign teams and resources.
5. Set dates and priority. 6. Review conflicts and coverage gaps. 7.
Submit for approval.

Plan detail: - Timeline. - Institution coverage. - Activity schedule. -
Resource allocation. - Plan changes and deferrals. - Approval history. -
Execution tracking.

## 6.4 Early Warning Alerts --- `/app/early-warnings`

Alert table: - Alert reference. - Institution. - Triggering indicator. -
Observed value. - Configured threshold. - Severity. - Trigger date. -
Assigned analyst. - Status.

Alert detail: - Trigger explanation. - Underlying source return and
period. - Historical trend. - Rule version. - Related alerts. - Analyst
assessment. - Escalation history. - Linked examination or supervisory
action.

Actions: - Acknowledge. - Assign. - Add assessment. - Escalate. -
Dismiss with reason. - Convert to supervisory action.

All alert thresholds are mock/configurable values and must be labelled
illustrative until approved regulatory rules are loaded.

------------------------------------------------------------------------

## 7. Examination Operations

## 7.1 Examination Register --- `/app/examinations`

Table columns: - Examination reference. - Institution. - Examination
type. - Scope/primary domains. - Team lead. - Planned dates. - Current
stage. - Progress. - Risk priority. - Status.

Views: - Table. - Calendar. - Kanban by stage.

Filters: - Institution. - Examination type. - Domain. - Team. -
Status. - Date range. - Priority.

Actions: - Create examination. - Open workspace. - Assign team. - View
report. - Export register.

## 7.2 Create Examination --- `/app/examinations/new`

Use a multi-step wizard with progress indicator.

Step 1 --- Basic information: - Institution. - Examination
title/reference. - Examination type: maiden, routine, special, targeted,
thematic, follow-up, spot check, joint. - Review period. - Planned
fieldwork dates. - Jurisdiction and supervisory department.

Step 2 --- Scope: - Examination objectives. - Domains. - Institution
locations/branches. - Products/business lines. - Scope limitations. -
Applicable methodology.

Step 3 --- Team: - Team lead. - Examiners. - Specialist reviewers. -
Role within examination. - Conflict declaration placeholder.

Step 4 --- Programme: - Choose examination library templates. - Select
procedures. - Add custom procedures. - Set procedure owner and priority.

Step 5 --- Information request: - Select document request templates. -
Add required documents and deadlines. - Choose institution portal
recipients.

Step 6 --- Review and submit: - Summary. - Validation. - Save draft. -
Submit for approval.

## 7.3 Examination Detail --- `/app/examinations/:examinationId`

Header: - Examination reference and title. - Institution. - Type. -
Status badge. - Progress. - Team lead. - Dates. - Contextual action
buttons.

Tabs: 1. Overview. 2. Scope & Objectives. 3. Team. 4. Work Programme. 5.
Information Requests. 6. Fieldwork. 7. Evidence. 8. Findings. 9.
Management Responses. 10. Reports. 11. Activity & Approvals.

Overview: - Completion progress. - Domain coverage. - Procedures
completed/pending. - Evidence received/outstanding. - Findings by
severity. - Upcoming milestones. - Activity timeline.

## 7.4 Examination Workspace --- `/app/examinations/:examinationId/workspace`

This is a primary daily-use screen.

Layout: - Left panel: domain and procedure tree. - Main panel: selected
procedure and test form. - Right panel: evidence, comments and review
status.

Procedure fields: - Procedure ID. - Domain. - Objective. - Examination
question. - Detailed steps. - Regulatory criteria. - Required
evidence. - Testing method. - Sample size/population. - Examiner. - Due
date. - Result: pass, fail, partial, not applicable, not tested. -
Exception details. - Conclusion. - Risk/severity. - Linked finding. -
Reviewer comments.

Interactions: - Mark procedure started/completed. - Save draft result. -
Add evidence. - Add sample records. - Raise finding from exception. -
Submit for review. - Return for rework. - Approve result (role-gated in
prototype).

Show unsaved state and confirm navigation if changes are pending.

## 7.5 Examination Library --- `/app/examination-library`

Library hierarchy: - Jurisdiction. - Institution category. - Supervisory
domain. - Examination type. - Programme. - Procedure.

List and detail: - Template title and ID. - Version. - Regulatory
references. - Effective dates. - Applicable institution categories. -
Owner. - Status: draft, under review, approved, retired.

Template editor: - Objectives. - Scope guidance. - Procedures. -
Evidence requirements. - Testing methodology. - Scoring guidance. -
Regulatory mapping. - Version history.

Only approved versions may be selected for a new examination. Existing
examinations retain their selected version.

## 7.6 Evidence Repository --- `/app/evidence`

Table: - Evidence reference. - Title/file name. - Institution. -
Examination. - Domain. - Evidence category. - Confidentiality
classification. - Uploaded by/date. - Version. - Review status.

Interactions: - Upload demo file. - Preview metadata. - Download demo
attachment if available. - Link to procedure/finding. - Add reviewer
note. - Mark reviewed/rejected. - View version history.

Evidence detail: - File preview or file placeholder. - Metadata. -
Source and collection date. - Integrity hash placeholder. - Linked
examination procedures. - Linked findings. - Version history. - Access
history.

## 7.7 Supervisory Findings --- `/app/findings`

List: - Finding reference. - Institution. - Examination. - Domain. -
Title. - Severity. - Regulatory breach classification. - Responsible
institution owner. - Due date. - Status.

Finding form should use: - Condition. - Criteria/regulatory
requirement. - Cause. - Consequence/risk. - Recommendation or required
corrective measure. - Evidence. - Severity and rationale. - Institution
response. - Regulatory reference. - Cross-domain links. - Reviewer and
approval.

Finding detail tabs: 1. Overview. 2. Examination Evidence. 3. Regulatory
Mapping. 4. Management Response. 5. Corrective Actions. 6. Review &
Approval. 7. History.

Use the familiar five-Cs finding structure as a documentation aid, while
supporting regulator-specific breach and intervention classifications.

## 7.8 Follow-Up & Remediation --- `/app/remediation`

-   Institution.
-   Finding.
-   Corrective action.
-   Action owner.
-   Target date.
-   Progress.
-   Evidence submitted.
-   Validation status.
-   Overdue indicator.

Detail: - Agreed action plan. - Milestones. - Institution updates. -
Evidence. - Supervisory validation. - Extension requests. - Escalation
history. - Closure decision.

Do not permit an institution user to close a supervisory finding. Only
authorised regulator roles can approve closure.

------------------------------------------------------------------------

## 8. Prudential supervision screens

Each prudential domain must have a landing dashboard, institution-level
detail, data tables, examination checks and exportable reports.

## 8.1 Capital Adequacy --- `/app/prudential/capital`

KPI cards: - Regulatory capital. - Risk-weighted assets. - Capital
adequacy ratio. - Capital buffer/shortfall.

Panels: - Capital composition. - CET1, Tier 1 and Tier 2 trend. -
Risk-weighted asset breakdown. - Capital deductions. - Capital stress
test results. - Institution exception list.

Tables: - Capital submissions. - Capital component breakdown. -
Regulatory adjustments. - Capital breaches.

Detail: - Formula/definition. - Source submission. - Reporting period. -
Applicable rule version. - Calculation breakdown. - Reviewer status.

## 8.2 Credit & Asset Quality --- `/app/prudential/credit`

KPI cards: - Gross loans. - NPL balance. - NPL ratio. - Provision
coverage. - Concentrated exposures.

Tabs: - Portfolio Overview. - Loan Classification. - Impairment &
Provisioning. - Large Exposures. - Related-Party Lending. -
Collateral. - Credit Examination.

Tables and charts: - Loan portfolio by sector. -
Performing/non-performing distribution. - Ageing and delinquency. - Top
borrowers. - Concentration by sector. - Restructured loans. - Provision
movement.

Loan sample review screen: - Facility/borrower reference. - Facility
type and amount. - Approval date/authority. - Outstanding balance. -
Days past due. - Classification. - Collateral status. - Provision. -
Examiner conclusion. - Supporting evidence.

## 8.3 Liquidity & Treasury --- `/app/prudential/liquidity`

KPI cards: - Liquidity position. - LCR. - NSFR. - Deposit
concentration. - FX exposure.

Tabs: - Liquidity Overview. - Funding Profile. - Asset-Liability
Management. - Treasury Operations. - Foreign Exchange. - Stress
Testing. - Exceptions.

Charts: - Funding maturity profile. - Deposit concentration. - Liquid
asset composition. - Currency exposure. - Liquidity trend.

Treasury examination workspace: - Transaction reference. - Trade date. -
Instrument/currency. - Counterparty. - Amount. - Dealing limit. -
Approval. - Settlement. - Examiner result.

## 8.4 Stress Testing --- `/app/prudential/stress-testing`

-   Scenario library.
-   Scenario assumptions.
-   Institution selection.
-   Capital, liquidity and credit impact.
-   Baseline versus stressed outcomes.
-   Scenario results.
-   Sensitivity analysis.
-   Reviewer and approval.

Prototype calculations must be labelled illustrative and must not be
represented as official regulatory stress-test results.

## 8.5 Prudential Indicators

Configurable catalogue: - Indicator name/code. - Definition. -
Formula. - Unit. - Applicable institution type. - Threshold and
severity. - Frequency. - Effective date. - Source return fields. -
Validation rules.

Provide indicator detail with formula breakdown, historical values and
threshold history.

------------------------------------------------------------------------

## 9. Specialist supervisory domains

Each specialist domain should use a consistent page pattern: 1. Domain
dashboard. 2. Assessment register. 3. Assessment/examination detail. 4.
Checklist and procedures. 5. Evidence. 6. Findings. 7. Report. 8.
Historical assessments.

## 9.1 Corporate Governance --- `/app/specialist/governance`

Submodules: - Board composition. - Director fit-and-proper
assessments. - Board committees. - Board effectiveness. - Executive
management. - Conflict of interest. - Related-party governance. -
Succession planning. - Governance policies.

Screens: - Governance dashboard. - Board and director register. -
Committee register. - Director profile. - Fit-and-proper assessment
wizard. - Board meeting/committee evidence review. - Governance
examination checklist. - Governance assessment report.

## 9.2 Enterprise Risk Management --- `/app/specialist/erm`

Submodules: - ERM framework. - Risk appetite. - Risk register
assessment. - Risk governance. - KRIs and limits. - Stress testing. -
Risk aggregation. - Operational resilience.

Screens: - ERM dashboard. - Risk framework assessment. - Risk appetite
review. - KRI monitoring. - Risk limit breach register. - Risk committee
assessment. - ERM maturity assessment. - Risk governance report.

## 9.3 IT & Cybersecurity --- `/app/specialist/cybersecurity`

Submodules: - IT governance. - IT risk management. - Infrastructure and
architecture. - Identity and access management. - Privileged access. -
Network security. - Database security. - Application security. -
Vulnerability management. - SOC/SIEM and threat monitoring. - Incident
response. - Business continuity and disaster recovery. - Cloud and
third-party technology. - Data protection. - AI and emerging technology
governance.

Screens: - Cybersecurity supervisory dashboard. - Cyber maturity
assessment. - IT governance checklist. - Infrastructure assessment. -
IAM/PAM review. - Vulnerability and penetration testing register. -
Security incident review. - Third-party technology assessment. - DR/BCP
assessment. - Cyber finding register. - Cybersecurity report.

Use domain-specific evidence fields such as policy, architecture
diagram, access review, vulnerability report, incident log, SOC alert,
DR test and third-party assurance.

## 9.4 AML/CFT/CPF --- `/app/specialist/aml`

Submodules: - ML/TF/PF risk assessment. - CDD/KYC/EDD. - Beneficial
ownership. - PEP and sanctions screening. - Transaction monitoring. -
Suspicious transaction reporting. - Correspondent banking. - AML
governance and training. - Independent AML review.

Screens: - AML supervisory dashboard. - Institution ML/TF/PF risk
profile. - AML programme assessment. - KYC sample review. - Transaction
monitoring sample review. - Sanctions control assessment. - Suspicious
activity reporting assessment. - AML examination report.

Use fictional and anonymised sample case data only.

## 9.5 Operations & Internal Controls --- `/app/specialist/operations`

Submodules: - Branch operations. - Cash/vault. - Transaction
processing. - Maker-checker. - Reconciliations. - General ledger and
suspense. - Fraud management. - Operational losses. - Internal audit
effectiveness. - Outsourced operations.

Screens: - Operational supervision dashboard. - Branch examination. -
Transaction sample review. - Reconciliation assessment. - Fraud and loss
analysis. - Internal audit effectiveness review. - Operational controls
report.

## 9.6 Consumer Protection --- `/app/specialist/consumer-protection`

Submodules: - Customer complaints. - Complaint resolution. - Fees and
charges. - Customer disclosures. - Digital channel disputes. - Customer
consent and privacy. - Fair treatment. - Consumer lending.

Screens: - Consumer protection dashboard. - Complaint trend analysis. -
Complaint sample review. - SLA breach register. - Unauthorised
deductions review. - Market conduct assessment. - Consumer protection
report.

Support referral/ownership across departments where this function
belongs to another supervisory department.

------------------------------------------------------------------------

## 10. Regulatory administration

## 10.1 Regulatory Frameworks --- `/app/regulatory/frameworks`

Framework library: - Framework name. - Jurisdiction. - Issuing
authority. - Framework category. - Version. - Publication/effective
date. - Status. - Source document.

Detail tabs: - Overview. - Requirements. - Applicability. - Mappings. -
Documents. - Version history.

Requirement detail: - Requirement reference. - Text. - Legal/standard
source. - Effective period. - Institution categories. - Supervisory
domain. - Evidence expected. - Examination procedures mapped. - Related
obligations.

Framework upload and AI extraction are simulated in the prototype.
Clearly distinguish AI-extracted draft requirements from approved
regulatory content.

## 10.2 Regulatory Obligations --- `/app/regulatory/obligations`

-   Obligation register.
-   Applicable institutions.
-   Responsible supervisory department.
-   Effective date.
-   Reporting frequency.
-   Evidence/return requirement.
-   Compliance status.
-   Last review.
-   Next review.

Provide obligation detail, applicability editor and change history.

## 10.3 Regulatory Correspondence

-   Official correspondence register.
-   Institution.
-   Reference number.
-   Correspondence type.
-   Date issued/received.
-   Subject.
-   Related examination/finding/directive.
-   Authorised sender/recipient.
-   Status.
-   Attachments.

Provide compose/review/approve/send-demo workflow. Do not send real
communications from the prototype.

------------------------------------------------------------------------

## 11. Regulatory Returns and Submission Monitoring

## 11.1 Returns dashboard --- `/app/returns`

KPI cards: - Expected submissions. - Received. - Pending. - Late. -
Rejected/returned. - Awaiting review.

Views: - Submission register. - Calendar. - Institution compliance. -
Return type. - Validation exceptions.

Columns: - Submission reference. - Institution. - Return type. -
Reporting period. - Due date. - Submission date. - Version. - Validation
result. - Review status.

## 11.2 Return definition/template designer

Fields: - Return name/code. - Jurisdiction. - Institution category. -
Frequency. - Reporting basis. - Effective dates. - Submission format. -
Required fields. - Validation rules. - Certification requirements. -
Approval status.

Support a visual schema/field designer prototype, with
add/remove/reorder field interactions.

## 11.3 Submission detail --- `/app/returns/:submissionId`

Tabs: 1. Submission Overview. 2. Submitted Data. 3. Validation Results.
4. Reconciliation. 5. Review Notes. 6. Version History. 7. Activity.

Display: - Original file metadata. - Validation summary. - Field-level
errors. - Cross-return exceptions. - Historical comparison. - Analyst
review. - Accept/reject/return-for-correction demo actions.

## 11.4 Institution submission portal

Institutions should only see their own submissions and assigned
requests. Portal functions: - Submission calendar. - Upload return. -
Validate draft. - Submit for certification. - View submission status. -
Correct/resubmit. - Respond to information requests. - View
regulator-issued directives and permitted correspondence. - Submit
remediation evidence. - Track due dates.

Do not expose internal risk scores, confidential examiner notes,
internal enforcement deliberations or other institutions' data.

------------------------------------------------------------------------

## 12. Enforcement and supervisory intervention

## 12.1 Enforcement Register --- `/app/enforcement`

Columns: - Case reference. - Institution. - Related finding(s). -
Measure type. - Severity. - Responsible officer. - Date opened. -
Response deadline. - Current status.

Filters: - Institution. - Measure type. - Status. - Severity. - Date. -
Responsible officer.

## 12.2 Enforcement case detail --- `/app/enforcement/:caseId`

Tabs: - Case Overview. - Linked Findings. - Legal/Regulatory Basis. -
Proposed Measure. - Reviews & Approvals. - Directive. - Institution
Response. - Corrective Actions. - Monitoring. - Closure. - Audit
History.

Case creation wizard: 1. Select institution. 2. Link
finding(s)/breach(es). 3. Select legally configured measure type. 4.
Record basis and supporting evidence. 5. Draft proposed action. 6. Route
legal/policy review. 7. Route authorised approval. 8. Issue demo
directive. 9. Track response and corrective action.

The UI must never imply that a system-generated recommendation itself
constitutes a legally authorised enforcement decision.

## 12.3 Directives, sanctions and corrective action plans

Separate registers and detail views: - Directive register. -
Penalty/sanction register. - Corrective action plans. - Deadline and
escalation tracker. - Closure validation queue.

Support approval, issue, response, extension request, monitoring and
closure states.

------------------------------------------------------------------------

## 13. Intelligence and reporting

## 13.1 Supervisory Reports --- `/app/reports`

Report catalogue: - Institution examination report. - Institutional risk
assessment. - Prudential compliance. - Capital adequacy. - Asset
quality. - Liquidity. - Governance. - Cybersecurity. - AML/CFT. -
Consumer protection. - Enforcement. - Industry risk. - Supervisory plan
execution.

Report builder: - Select report type. - Select institution/portfolio. -
Select reporting period. - Choose approved sections. - Choose data
scope. - Preview. - Save draft. - Route for review. - Export/print
prototype.

Report detail: - Version. - Status. - Author. - Reviewer. - Approval
trail. - Evidence and source references. - Comments. - Export action.

## 13.2 Industry Intelligence --- `/app/intelligence`

Dashboard: - Banking industry aggregate indicators. - Capital and
liquidity trends. - NPL trend. - Sector credit concentration. -
Institution risk distribution. - Common third-party/provider
exposures. - Interbank and interconnectedness views. - Emerging risk
themes. - Systemic risk watchlist.

Tabs: - Industry Overview. - Peer Groups. - Sector Exposure. -
Interconnectedness. - Systemic Risk. - Macroprudential Scenarios. -
Intelligence Reports.

All cross-institution views must be permission-aware and use only data
the user is authorised to see.

## 13.3 Peer Benchmarking --- `/app/peer-benchmarking`

-   Define peer groups by institution category, size, business model or
    jurisdiction.
-   Select indicators.
-   Compare institutions.
-   Show median, quartiles and distribution where data is sufficient.
-   View period trends.
-   Export authorised comparison.

Protect confidentiality: avoid exposing identifiable institution data to
users without authority.

## 13.4 AI Supervisory Assistant --- `/app/ai-assistant`

Layout: - Conversation panel. - Suggested supervisory prompts. -
Institution/period context selector. - Source documents panel. -
Retrieved references. - Draft analysis panel. - Copy/export action.

Capabilities represented in prototype: - Summarise a regulatory
framework. - Draft examination programme. - Analyse sample prudential
trends. - Explain an early warning alert. - Draft a finding from
supplied evidence. - Summarise examination results. - Review remediation
evidence.

Show "Demo AI response" and simulated source references. Never represent
fabricated AI results as verified legal interpretation or actual
institution analysis. The future implementation must enforce retrieval
permissions and human approval.

AI history page should show conversation title, date, user and linked
institution/examination, subject to access.

------------------------------------------------------------------------

## 14. User access management and system administration

This is a first-class area of the prototype. Build its full UI now, but
keep all user/role/permission data mocked until the Spring Boot security
backend is implemented.

## 14.1 User Management --- `/app/admin/users`

Table: - Avatar/name. - Staff ID. - Email. - Department. - Job title. -
Role(s). - Assigned portfolio/institutions. - Account status. - MFA
status (demo). - Last login (mock). - Created date.

Filters: - Department. - Role. - Status. - Institution/portfolio
assignment. - MFA status.

Actions: - Add user. - View profile. - Edit. - Assign role. - Assign
institution/portfolio. - Suspend/reactivate demo account. -
Reset-password demo action. - View access history.

### Create/edit user wizard

Step 1 --- Personal information: - First name. - Last name. - Display
name. - Staff ID. - Work email. - Phone. - Job title. - Department. -
Supervisor.

Step 2 --- Access: - User type: regulator staff, institution portal
user, external specialist, read-only observer. - Role(s). - Permission
profile. - Jurisdiction. - Department/portfolio. - Institution scope. -
Data classification clearance.

Step 3 --- Security: - MFA requirement. - Authentication method. -
Account start/end date. - Session policy. - Status.

Step 4 --- Review: - Access summary. - Conflict/segregation warnings. -
Save demo user.

## 14.2 User detail --- `/app/admin/users/:userId`

Tabs: 1. Profile. 2. Roles & Permissions. 3. Institution/Portfolio
Access. 4. Teams. 5. Security & Sessions. 6. Activity History.

Display: - User identity. - Account status. - Assigned roles. -
Effective permissions preview. - Data scope. - Recent activity. -
Login/session mock history. - Access review date.

Actions: - Edit profile. - Assign/remove role. - Change scope. -
Suspend/reactivate. - Trigger simulated access review. - View audit
events.

## 14.3 Roles Management --- `/app/admin/roles`

Create role templates: - System Administrator. - Regulator Director. -
Deputy Director. - Assistant Director. - Supervisory Team Lead. -
Principal Examiner. - Examiner. - Prudential Analyst. - Risk Analyst. -
Cybersecurity Specialist. - AML Specialist. - Legal/Enforcement
Officer. - Report Reviewer. - Read-Only Supervisor. - Institution
Administrator. - Institution Submitter. - Institution Viewer.

Role list: - Role name. - Role code. - Role category. - Assigned
users. - Permission count. - System/custom. - Status.

Role detail: - Description. - Permissions. - Data scope. - Assigned
users. - Separation-of-duties restrictions. - Version/history.

## 14.4 Permissions Management --- `/app/admin/permissions`

Build a permission matrix grouped by module.

Permission actions: - View. - Create. - Edit. - Delete (only where
appropriate). - Submit. - Review. - Approve. - Issue. - Export. -
Assign. - Close. - Configure.

Example: \| Module \| Examiner \| Team Lead \| Director \|
\|---\|---\|---\|---\| \| Institution Registry \| View assigned \| View
portfolio \| View authorised portfolio \| \| Examination \| Execute
assigned \| Review/manage \| Approve as delegated \| \| Evidence \|
Upload/view assigned \| Review \| View authorised \| \| Findings \|
Draft/submit \| Review \| Approve as delegated \| \| Enforcement \| View
permitted \| Recommend \| Approve as delegated \| \| User Management \|
None \| None \| Delegated administration \|

The final matrix must be configurable by regulator. This table is
illustrative only.

Include: - Permission search. - Role selector. - Module groups. - Bulk
permission toggle. - Unsaved change warning. - Effective permission
preview. - Conflict warning.

## 14.5 Teams & Departments --- `/app/admin/teams`

-   Department register.
-   Supervisory teams.
-   Team lead.
-   Members.
-   Specialist capabilities.
-   Institution portfolios.
-   Active examinations.
-   Workload distribution.

Support create/edit team, add/remove members and assign portfolios in
local state.

## 14.6 Workflow Configuration --- `/app/admin/workflows`

Visual workflow designer: - Workflow name and module. - Trigger. -
States. - Transition arrows. - Role/permission required. - Approval
levels. - Escalation rule. - SLA. - Notification event. - Active/version
status.

Include prebuilt workflows: - Examination approval. - Finding review. -
Supervisory report approval. - Regulatory return review. - Enforcement
approval. - Corrective action closure. - User access request.

Workflow designer interactions should allow adding states, editing
transitions and previewing the route. Actual workflow execution is
simulated.

## 14.7 Jurisdiction Configuration --- `/app/admin/jurisdictions`

-   Country.
-   Regulator.
-   Currency.
-   Time zone.
-   Institution categories.
-   Applicable frameworks.
-   Rating methodology.
-   Return definitions.
-   Date/number formats.
-   Data residency setting.
-   Status.

Support jurisdiction detail and edit drawer.

## 14.8 Institution Categories --- `/app/admin/institution-categories`

Examples: - Deposit Money Bank. - Merchant Bank. - Non-Interest Bank. -
Payment Service Bank. - Other category configured by the regulator.

The list is configurable; category examples are not a claim that all
categories belong to one department's supervisory remit.

## 14.9 Audit Trail --- `/app/admin/audit-trail`

Columns: - Timestamp. - User. - Action. - Module. - Record. - IP/device
(mock). - Outcome. - Event reference.

Filters: - User. - Action. - Module. - Date range. - Outcome. -
Institution.

Detail drawer: - Event metadata. - Before/after values where
appropriate. - Related record. - Actor and role. - Event correlation ID.

The prototype audit trail is illustrative. Production audit events must
be generated and protected by backend services.

## 14.10 System Settings --- `/app/admin/settings`

Sections: - General settings. - Brand and appearance (do not permit
arbitrary theme drift from the design system). - Notification
preferences. - Date/time formats. - Number/currency formats. - File
upload limits. - Session policy (display/configuration prototype). -
Data retention policy. - Email templates. - Integration settings. -
Feature flags. - Prototype data reset.

## 14.11 My Profile --- `/app/profile`

-   Personal details.
-   Job information.
-   Department and team.
-   Roles.
-   Assigned portfolio.
-   Notification preferences.
-   Appearance preferences.
-   Security information (mock).
-   Recent activity.

------------------------------------------------------------------------

## 15. Institution portal specification

The institution portal is a separate experience for authorised bank
staff. It must not reuse regulator navigation or reveal regulator-only
information.

### Portal navigation

-   Institution Dashboard.
-   Regulatory Returns.
-   Information Requests.
-   Examination Notices.
-   Remediation & Findings.
-   Directives & Correspondence.
-   Messages.
-   Documents.
-   Organisation Users.
-   Profile.

### Institution dashboard

KPI cards: - Returns due. - Returns submitted. - Information requests
outstanding. - Remediation actions due. - New regulator communications.

Panels: - Submission calendar. - Outstanding requests. - Corrective
action progress. - Recent correspondence. - Portal activity.

### Information request response

-   Request reference.
-   Regulator.
-   Related examination.
-   Description.
-   Required document.
-   Due date.
-   Confidentiality instruction.
-   Response field.
-   File upload.
-   Submit response.
-   Response history.

### Remediation response

-   Finding reference and approved institution-facing description.
-   Agreed action.
-   Owner.
-   Target date.
-   Progress.
-   Evidence upload.
-   Extension request.
-   Submit update.

Institution portal demo users must only access the selected demo
institution's records.

------------------------------------------------------------------------

## 16. Notifications and communication

### Notification panel

Categories: - Tasks assigned. - Review required. - Approval required. -
Regulatory return deadlines. - Information request deadlines. - Early
warning escalations. - Corrective action overdue. - System
notifications.

Interactions: - Mark read/unread. - Mark all read. - Filter. - Open
related record. - Notification preferences.

### In-app communication

-   Message thread linked to examination/request/finding.
-   Sender and recipient.
-   Timestamp.
-   Attachments.
-   Read state.
-   Internal-only or institution-visible classification.

Institution-visible and regulator-internal messages must be visually
distinguished and permission-controlled.

------------------------------------------------------------------------

## 17. Global interaction requirements

Every page must have coherent interaction states.

### 17.1 Tables

-   Search.
-   Filters.
-   Sorting.
-   Pagination.
-   Page size selector.
-   Row selection where useful.
-   Column visibility menu where useful.
-   Export mock.
-   Row detail navigation.
-   Empty state.
-   Loading skeleton.
-   Error state.

### 17.2 Forms

-   Inline validation.
-   Required markers.
-   Field help text.
-   Select/searchable select.
-   Date validation.
-   Dirty state.
-   Save draft.
-   Cancel confirmation.
-   Success/error toast.
-   Multi-step wizard progress.
-   Review summary before submit.

### 17.3 Modals and drawers

-   Consistent overlay and elevation.
-   Escape to close where safe.
-   Focus management.
-   Confirm destructive actions.
-   Prevent accidental loss of unsaved form data.
-   Responsive full-screen drawer/modal on mobile.

### 17.4 Prototype persistence

Use local state for active interactions. If persistence across refresh
is required, use a clearly isolated mock repository backed by
localStorage/sessionStorage. Provide a Reset Demo Data action.

Do not store real credentials, confidential information or production
data in browser storage.

### 17.5 Mock data rules

Use fictional institution names and fictional people. All financial
figures, ratios, risk scores, thresholds, dates and findings must be
clearly marked as demo/illustrative. Avoid real customer information and
actual confidential bank data.

Suggested demo institutions: - Meridian Commercial Bank (fictional). -
Northstar Merchant Bank (fictional). - Unity Non-Interest Bank
(fictional). - Crestline Payment Bank (fictional).

Use a consistent data set across dashboards, profiles, examinations,
returns, findings and alerts so that navigation tells one coherent
story.

------------------------------------------------------------------------

## 18. Frontend technical implementation guidance

### 18.1 Suggested stack

-   React JS.
-   TypeScript strongly recommended.
-   Vite.
-   React Router.
-   Tailwind CSS or CSS variables + utility approach aligned to
    thirdLine.
-   TanStack Table for data grids where suitable.
-   React Hook Form + Zod for forms and validation.
-   Recharts for charts.
-   Lucide React or existing agreed SVG icon library.
-   Zustand or Context for lightweight global prototype state.
-   Vitest and React Testing Library.

Use versions compatible with the project's selected Node.js LTS release.
Do not introduce unnecessary state-management or UI libraries if the
existing application already has equivalents.

### 18.2 Frontend architecture

``` text
atheris-reg-frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers/
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   ├── data-display/
│   │   ├── forms/
│   │   ├── charts/
│   │   ├── navigation/
│   │   └── feedback/
│   ├── layouts/
│   │   ├── RegulatorLayout.tsx
│   │   ├── InstitutionPortalLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── features/
│   │   ├── dashboard/
│   │   ├── institutions/
│   │   ├── surveillance/
│   │   ├── risk/
│   │   ├── examinations/
│   │   ├── evidence/
│   │   ├── findings/
│   │   ├── prudential/
│   │   ├── specialist/
│   │   ├── regulatory/
│   │   ├── returns/
│   │   ├── enforcement/
│   │   ├── intelligence/
│   │   ├── ai-assistant/
│   │   ├── administration/
│   │   └── institution-portal/
│   ├── mocks/
│   │   ├── fixtures/
│   │   ├── repositories/
│   │   └── scenarios/
│   ├── services/
│   │   ├── mock/
│   │   └── contracts/
│   ├── hooks/
│   ├── store/
│   ├── types/
│   ├── utils/
│   └── styles/
├── tests/
├── .env.example
├── package.json
└── README.md
```

### 18.3 Mock service abstraction

Components must not import fixture arrays directly. Use service
contracts and mock implementations.

Example:

``` ts
export interface InstitutionService {
  list(params: InstitutionQuery): Promise<Paginated<Institution>>;
  getById(id: string): Promise<Institution>;
  create(input: CreateInstitutionInput): Promise<Institution>;
  update(id: string, input: UpdateInstitutionInput): Promise<Institution>;
}
```

Prototype implementation: - `MockInstitutionService` reads/writes local
mock repository. - Future implementation: `ApiInstitutionService` calls
Spring Boot REST endpoints. - UI components depend on the interface, not
on implementation details.

Use the same approach for examination, risk, returns, findings,
enforcement, users, roles, workflows and reporting.

### 18.4 API-ready data contracts

Define frontend TypeScript types for: - Institution. -
InstitutionGroup. - Director. - SupervisoryPlan. - RiskAssessment. -
RiskCategory. - Examination. - ExaminationProcedure. - TestResult. -
Evidence. - SupervisoryFinding. - ManagementResponse. -
CorrectiveAction. - PrudentialReturn. - ReturnSubmission. -
PrudentialIndicator. - RegulatoryFramework. - RegulatoryRequirement. -
EnforcementCase. - Directive. - User. - Role. - Permission. - Team. -
WorkflowDefinition. - Notification. - AuditEvent.

Use stable UUID-shaped mock identifiers. Keep dates in ISO 8601 format
and monetary amounts as decimal strings or safe decimal representations.

### 18.5 State management

Global prototype state: - Current demo user. - Current demo role. -
Current jurisdiction. - Current institution context. - Sidebar state. -
Notifications. - Demo preferences.

Feature state: - Search and filters. - Selected records. - Wizard
state. - Modal/drawer state. - Form state. - Table pagination/sorting.

Avoid placing all application data into one global store.

### 18.6 Future backend integration boundary

When the backend phase begins: - Replace mock services with Spring Boot
API services. - Retain page components and design system. - Add real
OIDC/OAuth authentication. - Enforce all roles and permissions
server-side. - Add API error handling and refresh/session logic. -
Replace browser mock persistence with backend persistence. - Use
OpenAPI-generated types where practical.

No frontend role check is a substitute for backend authorisation.

------------------------------------------------------------------------

## 19. Demo roles and access scenarios

Provide a prototype role switcher to demonstrate access-dependent
navigation and action visibility.

Demo roles: 1. System Administrator. 2. Director of Supervision. 3.
Deputy Director. 4. Assistant Director. 5. Supervisory Team Lead. 6.
Principal Examiner. 7. Examiner. 8. Prudential Analyst. 9. Risk Analyst.
10. Cybersecurity Specialist. 11. AML Specialist. 12. Legal/Enforcement
Officer. 13. Report Reviewer. 14. Read-Only Supervisor. 15. Institution
Administrator. 16. Institution Submitter. 17. Institution Viewer.

For each role, define a mock permission profile: - Visible navigation. -
Allowed page actions. - Institution/portfolio scope. - Approval
capability. - Export capability. - Restricted data areas.

Role switcher must display a persistent "DEMO ROLE --- NOT SECURE
AUTHENTICATION" indicator. Institution roles switch into the institution
portal layout, not the regulator layout.

------------------------------------------------------------------------

## 20. Prototype quality and acceptance criteria

The prototype is ready for stakeholder review only when all criteria
below are met.

### Visual consistency

-   [ ] ThirdLine design-system palette and typography are consistently
    applied.
-   [ ] Sidebar and topbar dimensions/behaviour match the reference.
-   [ ] Cards, tables, badges, forms, modals and notifications follow
    reference patterns.
-   [ ] No unrelated visual theme or inconsistent icon style.
-   [ ] All pages have consistent breadcrumbs and page headers.

### Functional coverage

-   [ ] All 18 supervisory domains have accessible pages.
-   [ ] Every listed primary route renders.
-   [ ] Institution profile tabs work.
-   [ ] Examination creation wizard works.
-   [ ] Examination workspace procedures can be updated locally.
-   [ ] Evidence can be added as mock metadata/file selection.
-   [ ] Findings can be created and linked to examinations.
-   [ ] Returns can be submitted and validated using demo rules.
-   [ ] Risk assessment wizard works.
-   [ ] Supervisory plan interactions work.
-   [ ] Enforcement case workflow can be demonstrated.
-   [ ] Reports can be previewed.
-   [ ] AI assistant displays clearly labelled simulated outputs.
-   [ ] User management supports add/edit/suspend demo users.
-   [ ] Role and permission matrix is interactive.
-   [ ] Workflow configuration is interactive.
-   [ ] Institution portal is separate and access-scoped.
-   [ ] Global search and notifications work.
-   [ ] Demo data reset works.

### Interaction quality

-   [ ] No dead buttons or inert navigation items.
-   [ ] Form validation is present.
-   [ ] Loading, empty, error and success states are designed.
-   [ ] Destructive actions require confirmation.
-   [ ] Unsaved changes are protected.
-   [ ] Tables have functional sorting/filtering/pagination where
    applicable.
-   [ ] Keyboard and focus behaviour is usable.

### Technical quality

-   [ ] No backend dependency.
-   [ ] Mock data isolated from UI components.
-   [ ] Service abstraction is in place.
-   [ ] TypeScript types are defined.
-   [ ] Responsive layout works at desktop/tablet/mobile widths.
-   [ ] No console errors in normal user journeys.
-   [ ] Basic unit/component tests cover key flows.
-   [ ] README explains startup, demo roles and mock-data reset.

------------------------------------------------------------------------

## 21. Recommended build sequence

Build the prototype in vertical slices. Do not create 100 disconnected
screens before testing the shared shell.

### Phase 1 --- Design system and application shell

-   Brand/logo adaptation.
-   Tokens and typography.
-   Sidebar, topbar, breadcrumbs.
-   Shared UI components.
-   Authentication layouts.
-   Router and mock session.
-   Responsive behaviour.

**Acceptance:** User can sign in to the demo and navigate the
application shell.

### Phase 2 --- Core supervisory journey

-   Command Centre.
-   Institution Registry.
-   Institution Profile.
-   Risk Assessment.
-   Supervisory Plans.
-   Examination Register.
-   Examination Creation.
-   Examination Workspace.
-   Evidence.
-   Findings and Remediation.

**Acceptance:** Demonstrate one institution from onboarding through risk
assessment, examination, evidence, finding and remediation.

### Phase 3 --- Prudential and returns

-   Off-Site Surveillance.
-   Regulatory Returns.
-   Submission validation.
-   Capital.
-   Credit.
-   Liquidity.
-   Stress Testing.
-   Early Warnings.

**Acceptance:** Demonstrate a return submission flowing into prudential
monitoring and an alert.

### Phase 4 --- Specialist supervision and regulatory administration

-   Governance.
-   ERM.
-   Cybersecurity.
-   AML/CFT.
-   Operations.
-   Consumer Protection.
-   Frameworks.
-   Obligations.
-   Correspondence.

**Acceptance:** Demonstrate a specialist examination mapped to
regulatory requirements.

### Phase 5 --- Enforcement, intelligence and reports

-   Enforcement.
-   Directives.
-   Corrective Action Plans.
-   Supervisory Reports.
-   Industry Intelligence.
-   Peer Benchmarking.
-   AI Assistant.

**Acceptance:** Demonstrate an approved finding progressing through a
directive, remediation and closure review.

### Phase 6 --- User access management and institution portal

-   User Management.
-   Roles.
-   Permissions.
-   Teams.
-   Workflow Configuration.
-   Jurisdiction Settings.
-   Audit Trail.
-   Institution Portal.

**Acceptance:** Demonstrate regulator and institution roles with
different navigation, page access and actions.

### Phase 7 --- Hardening and stakeholder review

-   Responsive QA.
-   Accessibility.
-   Visual regression.
-   Complete interaction audit.
-   Mock data consistency.
-   User journey testing.
-   Stakeholder feedback and refinement.

------------------------------------------------------------------------

## 22. Required end-to-end prototype demonstrations

The finished prototype must support these coherent demonstrations.

### Journey A --- Supervisory examination

1.  Register a fictional bank.
2.  Open its institution profile.
3.  Complete a risk assessment.
4.  Create a risk-based examination.
5.  Assign an examination team.
6.  Select credit, liquidity and cybersecurity procedures.
7.  Record testing and upload mock evidence.
8.  Raise a finding.
9.  Review and approve the finding.
10. View the draft examination report.

### Journey B --- Off-site surveillance

1.  Open regulatory returns.
2.  View a fictional submitted return.
3.  Inspect validation results.
4.  Open prudential indicators.
5.  View a threshold/trend alert.
6.  Assign an analyst.
7.  Initiate a targeted examination.

### Journey C --- Remediation and enforcement

1.  Open a supervisory finding.
2.  Review institution response.
3.  Create a corrective action plan.
4.  View overdue milestones.
5.  Open an enforcement case.
6.  Route the proposed measure for approval.
7.  Review remediation evidence.
8.  Record a supervisory closure decision.

### Journey D --- User access management

1.  Sign in as System Administrator.
2.  Create a demo examiner.
3.  Assign the Examiner role.
4.  Assign a supervisory team and institution portfolio.
5.  Preview effective permissions.
6.  Switch to the examiner demo role.
7.  Verify that only permitted navigation and actions appear.
8.  Switch to an institution user.
9.  Verify that the institution portal is shown and regulator-only pages
    are inaccessible in the prototype.

### Journey E --- Industry intelligence

1.  Open the industry dashboard.
2.  Select a peer group.
3.  Compare fictional institutions.
4.  Review aggregate prudential trends.
5.  Open a systemic risk scenario.
6.  Generate a draft intelligence report.

------------------------------------------------------------------------

## 23. Final instruction to the frontend development team

Build **Atheris Reg as a complete, polished, interactive regulatory
supervision frontend prototype**, using the uploaded thirdLine design
system as the mandatory visual reference.

The priority is not to create a collection of static dashboards. The
priority is to demonstrate a connected supervisory operating environment
in which institutions, returns, risks, examinations, evidence, findings,
corrective actions, directives, reports, users and permissions relate to
one another.

The UI must be complete enough for product demonstrations, regulatory
stakeholder workshops and user acceptance feedback before backend
development begins.

### Non-negotiable boundaries

-   No Spring Boot backend in this phase.
-   No PostgreSQL connection in this phase.
-   No real authentication or production access control in this phase.
-   No real regulatory submission or enforcement communication.
-   No real bank/customer data.
-   No fabricated claims of official CBN endorsement or regulatory
    approval.
-   No reuse of thirdLine audit-specific terminology where a supervisory
    term is appropriate.
-   No dead-end screens or non-functional primary actions.
-   No redesign of the inherited thirdLine design language without
    documented approval.

**The prototype should be backend-ready, not backend-dependent.**

The next development stage, after UI approval, will implement the Java
Spring Boot services, PostgreSQL schema, authentication, server-side
authorisation, workflow engine, regulatory data ingestion, evidence
storage and integrations against the contracts established during this
frontend phase.
