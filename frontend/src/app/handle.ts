/**
 * Route `handle` metadata used by the shell (topbar title + breadcrumbs)
 * and by the placeholder pages (phase labelling).
 */
export interface RouteHandle {
  /** Breadcrumb label; also used as the topbar page title for leaf routes. */
  breadcrumb?: string
  /** Build phase that owns the full screen (Spec §21), for placeholders. */
  phase?: number
}

export const getRouteHandle = (match: { handle?: unknown }): RouteHandle =>
  (match.handle as RouteHandle | undefined) ?? {}
