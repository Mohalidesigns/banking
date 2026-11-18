import { cx } from '@/utils/cx'

/**
 * User avatar per DS §8.2: 36×36 circle, gradient #1A365D → #2D5F9A,
 * white initials at 14px/600.
 */
interface UserAvatarProps {
  initials: string
  name: string
  size?: number
  className?: string
}

export function UserAvatar({ initials, name, size = 36, className }: UserAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'tld-gradient-avatar inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
      style={{ width: size, height: size, fontSize: size >= 36 ? 14 : 11 }}
      data-initials={initials}
      title={name}
    >
      {initials}
    </span>
  )
}
