import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DemoUser, Jurisdiction } from '@/types/auth'
import type { SessionResult } from '@/services/contracts/AuthService'

/**
 * Global prototype session state (Spec §18.5).
 * Persisted to localStorage under a clearly-namespaced prototype key.
 * No credentials or confidential data are stored (Spec §17.4).
 */
interface SessionState {
  currentUser: DemoUser | null
  jurisdictions: Jurisdiction[]
  jurisdiction: Jurisdiction | null
  sidebarCollapsed: boolean
  /** Nav group id -> expanded. Remembered for the prototype session (Spec §3.2). */
  expandedGroups: Record<string, boolean>
  mobileNavOpen: boolean

  startSession: (result: SessionResult) => void
  endSession: () => void
  setJurisdiction: (jurisdiction: Jurisdiction) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleGroup: (groupId: string) => void
  setMobileNavOpen: (open: boolean) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      jurisdictions: [],
      jurisdiction: null,
      sidebarCollapsed: false,
      expandedGroups: {},
      mobileNavOpen: false,

      startSession: ({ user, jurisdictions }) =>
        set((state) => ({
          currentUser: user,
          jurisdictions,
          jurisdiction:
            jurisdictions.find((j) => j.id === state.jurisdiction?.id) ??
            jurisdictions[0] ??
            null,
        })),

      endSession: () =>
        set({
          currentUser: null,
          jurisdictions: [],
          jurisdiction: null,
          mobileNavOpen: false,
        }),

      setJurisdiction: (jurisdiction) => set({ jurisdiction }),

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      toggleGroup: (groupId) =>
        set((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [groupId]: !(state.expandedGroups[groupId] ?? true),
          },
        })),

      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    {
      name: 'atheris-reg-prototype-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        jurisdictions: state.jurisdictions,
        jurisdiction: state.jurisdiction,
        sidebarCollapsed: state.sidebarCollapsed,
        expandedGroups: state.expandedGroups,
      }),
    },
  ),
)
