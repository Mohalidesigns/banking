/**
 * Shared chart palette — exact thirdLine token values (DS §2.3/§2.7/§8.7).
 * Semantic colour is never decorative: risk colours follow the risk-badge
 * scale, trend lines use success/error/primary-surface semantics.
 */
export const RISK_COLORS = {
  Critical: '#C53030', // --tld-error
  High: '#DD6B20', // --tld-warning
  Medium: '#D4AF37', // --tld-accent (DS §8.7 medium dot)
  Low: '#2D7D46', // --tld-success
} as const

export const CHART_COLORS = {
  primary: '#1A365D',
  primarySurface: '#2D5F9A',
  accent: '#D4AF37',
  success: '#2D7D46',
  warning: '#DD6B20',
  error: '#C53030',
  purple: '#6B46C1',
  info: '#319795',
  grid: '#E2E8F0',
  axis: '#718096',
} as const

export const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    fontSize: 12,
    fontFamily: "'Inter Variable', system-ui, sans-serif",
  },
  labelStyle: { color: '#1A365D', fontWeight: 600 },
} as const
