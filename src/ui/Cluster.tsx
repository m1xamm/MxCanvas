import type { ComponentChildren, RefObject } from 'preact'

export type ClusterDirection = 'horizontal' | 'vertical'
export type ClusterRole = 'group' | 'toolbar' | 'menu'

export interface ClusterProps {
  direction?: ClusterDirection
  role?: ClusterRole
  ariaLabel?: string
  class?: string
  rootRef?: RefObject<HTMLDivElement | null>
  children?: ComponentChildren
}

export function Cluster({
  direction = 'horizontal',
  role,
  ariaLabel,
  class: extraClass,
  rootRef,
  children,
}: ClusterProps) {
  const className = extraClass
    ? `cluster cluster--${direction} ${extraClass}`
    : `cluster cluster--${direction}`
  return (
    <div ref={rootRef} class={className} role={role} aria-label={ariaLabel}>
      {children}
    </div>
  )
}
