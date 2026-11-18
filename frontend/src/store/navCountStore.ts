import { create } from 'zustand'
import type { NavCounts } from '@/services/contracts/SupervisionReadService'
import { queueCountsService } from '@/services/mock/MockSupervisionReadService'

/**
 * Live sidebar queue counts (Spec §3.2). Fetched through the
 * QueueCountsService contract over the mock repositories — the numbers in
 * the sidebar always match what the linked screens show.
 */
interface NavCountState {
  counts: NavCounts | null
  loaded: boolean
  loading: boolean
  refresh: () => Promise<void>
}

export const useNavCountStore = create<NavCountState>()((set, get) => ({
  counts: null,
  loaded: false,
  loading: false,

  refresh: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const counts = await queueCountsService.navCounts()
      set({ counts, loaded: true, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))

/** Nav path -> live count key mapping (actionable queues only). */
export const NAV_COUNT_PATHS: Record<string, keyof NavCounts> = {
  '/app/my-work': 'myWork',
  '/app/early-warnings': 'earlyWarnings',
  '/app/findings': 'findings',
  '/app/returns': 'overdueReturns',
  '/app/enforcement': 'enforcement',
}
