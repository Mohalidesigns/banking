import { create } from 'zustand'

/** Transient UI state (Spec §18.5 feature state) — not persisted. */
interface UIState {
  searchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
}))
