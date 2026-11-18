import { create } from 'zustand'

/** Transient UI state (Spec §18.5 feature state) — not persisted. */
interface UIState {
  searchOpen: boolean
  recentSearches: string[]
  openSearch: () => void
  closeSearch: () => void
  addRecentSearch: (query: string) => void
}

export const useUIStore = create<UIState>()((set) => ({
  searchOpen: false,
  recentSearches: [],
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  addRecentSearch: (query) =>
    set((state) => ({
      recentSearches: [query, ...state.recentSearches.filter((q) => q !== query)].slice(0, 6),
    })),
}))
