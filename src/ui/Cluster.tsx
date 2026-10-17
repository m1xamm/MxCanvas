import type { ComponentChildren } from 'preact'

export type ClusterDirection = 'horizontal' | 'vertical'
export type ClusterRole = 'group' | 'toolbar'

export interface ClusterProps {
  direction?: ClusterDirection
  role?: ClusterRole
  ariaLabel?: string
  class?: string
  children?: ComponentChildren
}

export function Cluster({
  direction = 'horizontal',
  role,
  ariaLabel,
  class: extraClass,
  children,
}: ClusterProps) {
  const className = extraClass
    ? `cluster cluster--${direction} ${extraClass}`
    : `cluster cluster--${direction}`
  return (
    <div class={className} role={role} aria-label={ariaLabel}>
      {children}
    </div>
  )
}
