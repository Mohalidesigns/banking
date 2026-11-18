import { useSyncExternalStore } from 'react'

/**
 * Reactive CSS media query hook (responsive shell behaviour, Spec §2.6).
 * Uses useSyncExternalStore to subscribe to matchMedia without effects.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsTabletOrUp = () => useMediaQuery('(min-width: 768px)')
