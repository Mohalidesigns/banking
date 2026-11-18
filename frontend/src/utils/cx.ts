/** Minimal classnames joiner — avoids adding a utility library (Spec §18.1). */
export const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ')
