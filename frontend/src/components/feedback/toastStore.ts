import { create } from 'zustand'

/**
 * Toast stack state (DS §8.18). Auto-dismiss (5s + progress bar) is handled
 * by the ToastHost so timers follow the visible lifecycle.
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast-${++counter}-${Date.now()}`
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    return id
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/** Convenience helper for components outside React (services, guards). */
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().push({ type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().push({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().push({ type: 'info', title, message }),
}
