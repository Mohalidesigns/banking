/**
 * Demo notification fixtures (Spec §16 categories, §17.5 fictional data).
 * Consumed only by the mock notification repository.
 */
import type { Notification } from '@/types/common'

export const NOTIFICATIONS: Notification[] = [
  {
    id: '6ba7b810-9dad-41d1-80b4-00c04fd430c1',
    category: 'return-deadline',
    severity: 'critical',
    title: 'Monthly prudential return overdue — Meridian Commercial Bank',
    body: 'The MPR-09 capital adequacy return for Meridian Commercial Bank (MCB-001) passed its submission deadline. Demo data — illustrative only.',
    createdAt: '2026-11-18T07:45:00Z',
    read: false,
    link: '/app/returns',
  },
  {
    id: '6ba7b810-9dad-41d1-80b4-00c04fd430c2',
    category: 'early-warning',
    severity: 'warning',
    title: 'Early warning escalation — Northstar Merchant Bank',
    body: 'Liquidity coverage indicator crossed the amber threshold for the second consecutive week. Demo data — illustrative only.',
    createdAt: '2026-11-17T16:20:00Z',
    read: false,
    link: '/app/early-warnings',
  },
  {
    id: '6ba7b810-9dad-41d1-80b4-00c04fd430c3',
    category: 'review-required',
    severity: 'info',
    title: 'Finding awaiting review — Unity Non-Interest Bank examination',
    body: 'Draft finding FND-2026-118 (governance domain) is ready for lead supervisor review. Demo data.',
    createdAt: '2026-11-17T11:05:00Z',
    read: false,
    link: '/app/findings',
  },
  {
    id: '6ba7b810-9dad-41d1-80b4-00c04fd430c4',
    category: 'task-assigned',
    severity: 'info',
    title: 'Task assigned — Crestline Payment Bank risk assessment',
    body: 'You were assigned the 2026 annual risk assessment for Crestline Payment Bank (CPB-004). Demo data.',
    createdAt: '2026-11-16T09:30:00Z',
    read: true,
    link: '/app/risk-assessments',
  },
  {
    id: '6ba7b810-9dad-41d1-80b4-00c04fd430c5',
    category: 'corrective-action-overdue',
    severity: 'critical',
    title: 'Corrective action overdue — Meridian Commercial Bank',
    body: 'CAP-2026-003 (AML transaction monitoring remediation) is 14 days past its target date. Demo data — illustrative only.',
    createdAt: '2026-11-15T14:10:00Z',
    read: true,
    link: '/app/remediation',
  },
  {
    id: '6ba7b810-9dad-41d1-80b4-00c04fd430c6',
    category: 'system',
    severity: 'info',
    title: 'Prototype session reminder',
    body: 'You are in the Atheris Reg demo environment. All records are fictional and no action has regulatory effect.',
    createdAt: '2026-11-14T08:00:00Z',
    read: true,
  },
]
