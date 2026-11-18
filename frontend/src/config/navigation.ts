import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Ban,
  Banknote,
  Bell,
  BellRing,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  CalendarDays,
  ClipboardList,
  Cog,
  Contact,
  CreditCard,
  Crosshair,
  Droplets,
  FileExclamationPoint,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  FolderOpen,
  FolderSearch,
  Gauge,
  Gavel,
  Globe,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Layers,
  Library,
  ListChecks,
  ListTodo,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Network,
  Radar,
  Radio,
  Repeat,
  RotateCcw,
  Scale,
  ScrollText,
  Settings,
  Share2,
  Shield,
  ShieldExclamationPoint,
  Sparkles,
  Tags,
  TrendingUp,
  TriangleExclamationPoint,
  UserCog,
  Users,
  Workflow,
} from 'lucide-react'

export interface NavItem {
  label: string
  /** Real prototype route (Spec §4; sidebar-only items get dedicated routes). */
  path: string
  icon: LucideIcon
  /** Live actionable queue count (Spec §3.2), injected by the Sidebar from
   *  the QueueCountsService — never hard-coded here. */
  count?: number
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

/**
 * Full regulator navigation tree (Spec §3.2). Every item routes to a real
 * prototype page; routes not in Spec §4 are registered so the shell has no
 * dead ends (their screens land in the phase named by ROUTE_PHASES).
 */
export const REGULATOR_NAV: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { label: 'Supervisory Command Centre', path: '/app/dashboard', icon: LayoutDashboard },
      { label: 'My Work', path: '/app/my-work', icon: Briefcase },
      { label: 'Notifications', path: '/app/notifications', icon: Bell },
    ],
  },
  {
    id: 'institutions',
    label: 'Institution Management',
    items: [
      { label: 'Institution Registry', path: '/app/institutions', icon: Building },
      { label: 'Institution Groups', path: '/app/institution-groups', icon: Layers },
      { label: 'Branch Network', path: '/app/branch-network', icon: Network },
      { label: 'Directors & Key Officers', path: '/app/directors', icon: Users },
    ],
  },
  {
    id: 'surveillance',
    label: 'Surveillance & Risk',
    items: [
      { label: 'Off-Site Surveillance', path: '/app/surveillance', icon: Radar },
      { label: 'Risk-Based Supervision', path: '/app/risk-based-supervision', icon: Crosshair },
      { label: 'Risk Assessments', path: '/app/risk-assessments', icon: Gauge },
      { label: 'Early Warning Alerts', path: '/app/early-warnings', icon: TriangleExclamationPoint },
      { label: 'Supervisory Plans', path: '/app/supervisory-plans', icon: CalendarDays },
    ],
  },
  {
    id: 'examinations',
    label: 'Examination Operations',
    items: [
      { label: 'Examination Register', path: '/app/examinations', icon: ClipboardList },
      { label: 'Examination Calendar', path: '/app/examination-calendar', icon: Calendar },
      { label: 'Examination Programmes', path: '/app/examination-programmes', icon: ListChecks },
      { label: 'Fieldwork Workspace', path: '/app/fieldwork', icon: FolderSearch },
      { label: 'Evidence Repository', path: '/app/evidence', icon: FolderOpen },
      { label: 'Supervisory Findings', path: '/app/findings', icon: FileExclamationPoint },
      { label: 'Follow-Up & Remediation', path: '/app/remediation', icon: Repeat },
    ],
  },
  {
    id: 'prudential',
    label: 'Prudential Supervision',
    items: [
      { label: 'Capital Adequacy', path: '/app/prudential/capital', icon: Landmark },
      { label: 'Credit & Asset Quality', path: '/app/prudential/credit', icon: CreditCard },
      { label: 'Liquidity & Treasury', path: '/app/prudential/liquidity', icon: Droplets },
      { label: 'Prudential Indicators', path: '/app/prudential/indicators', icon: Activity },
      { label: 'Stress Testing', path: '/app/prudential/stress-testing', icon: FlaskConical },
    ],
  },
  {
    id: 'specialist',
    label: 'Specialist Supervision',
    items: [
      { label: 'Corporate Governance', path: '/app/specialist/governance', icon: Scale },
      { label: 'Enterprise Risk Management', path: '/app/specialist/erm', icon: ShieldExclamationPoint },
      { label: 'IT & Cybersecurity', path: '/app/specialist/cybersecurity', icon: Lock },
      { label: 'AML/CFT/CPF', path: '/app/specialist/aml', icon: Banknote },
      { label: 'Operations & Internal Controls', path: '/app/specialist/operations', icon: Cog },
      { label: 'Consumer Protection', path: '/app/specialist/consumer-protection', icon: HeartHandshake },
    ],
  },
  {
    id: 'regulatory',
    label: 'Regulatory Administration',
    items: [
      { label: 'Regulatory Frameworks', path: '/app/regulatory/frameworks', icon: Library },
      { label: 'Regulatory Obligations', path: '/app/regulatory/obligations', icon: ScrollText },
      { label: 'Regulatory Returns', path: '/app/returns', icon: FileSpreadsheet },
      { label: 'Submission Monitoring', path: '/app/submission-monitoring', icon: Radio },
      { label: 'Regulatory Correspondence', path: '/app/regulatory/correspondence', icon: Mail },
    ],
  },
  {
    id: 'action',
    label: 'Supervisory Action',
    items: [
      { label: 'Enforcement Cases', path: '/app/enforcement', icon: Gavel },
      { label: 'Supervisory Directives', path: '/app/directives', icon: Megaphone },
      { label: 'Sanctions & Penalties', path: '/app/sanctions', icon: Ban },
      { label: 'Corrective Action Plans', path: '/app/corrective-action-plans', icon: ListTodo },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence & Reporting',
    items: [
      { label: 'Supervisory Reports', path: '/app/reports', icon: FileText },
      { label: 'Industry Intelligence', path: '/app/intelligence', icon: Globe },
      { label: 'Peer Benchmarking', path: '/app/peer-benchmarking', icon: TrendingUp },
      { label: 'Systemic Risk', path: '/app/systemic-risk', icon: Share2 },
      { label: 'AI Supervisory Assistant', path: '/app/ai-assistant', icon: Sparkles },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { label: 'User Management', path: '/app/admin/users', icon: UserCog },
      { label: 'Roles & Permissions', path: '/app/admin/roles', icon: Shield },
      { label: 'Teams & Departments', path: '/app/admin/teams', icon: Contact },
      { label: 'Workflow Configuration', path: '/app/admin/workflows', icon: Workflow },
      { label: 'Examination Library', path: '/app/examination-library', icon: BookOpen },
      { label: 'Jurisdiction Configuration', path: '/app/admin/jurisdictions', icon: MapPin },
      { label: 'Institution Categories', path: '/app/admin/institution-categories', icon: Tags },
      { label: 'Notification Settings', path: '/app/admin/notification-settings', icon: BellRing },
      { label: 'Audit Trail', path: '/app/admin/audit-trail', icon: RotateCcw },
      { label: 'System Settings', path: '/app/admin/settings', icon: Settings },
    ],
  },
]

/** Institution portal navigation (Spec §15). */
export const PORTAL_NAV: NavItem[] = [
  { label: 'Institution Dashboard', path: '/portal/dashboard', icon: LayoutDashboard },
  { label: 'Regulatory Returns', path: '/portal/returns', icon: FileSpreadsheet },
  { label: 'Information Requests', path: '/portal/requests', icon: Mail },
  { label: 'Examination Notices', path: '/portal/examination-notices', icon: ClipboardList },
  { label: 'Remediation & Findings', path: '/portal/remediation', icon: Repeat },
  { label: 'Directives & Correspondence', path: '/portal/directives', icon: ScrollText },
  { label: 'Messages', path: '/portal/messages', icon: MessageSquare },
  { label: 'Documents', path: '/portal/documents', icon: FolderOpen },
  { label: 'Organisation Users', path: '/portal/users', icon: Users },
  { label: 'Profile', path: '/portal/profile', icon: UserCog },
]

/** Flatten helper for search/breadcrumb lookups. */
export const ALL_NAV_ITEMS: NavItem[] = REGULATOR_NAV.flatMap((s) => s.items)
