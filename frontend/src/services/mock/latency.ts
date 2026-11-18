/** Shared simulated network latency for mock services (Spec §18.3). */
export const LATENCY_MS = 120
export const latency = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS))
