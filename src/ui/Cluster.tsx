import type { ComponentChildren } from 'preact'

export type ClusterDirection = 'horizontal' | 'vertical'

export interface ClusterProps {
  direction?: ClusterDirection
  class?: string
  children?: ComponentChildren
}

export function Cluster({ direction = 'horizontal', class: extraClass, children }: ClusterProps) {
  const className = extraClass
    ? `cluster cluster--${direction} ${extraClass}`
    : `cluster cluster--${direction}`
  return <div class={className}>{children}</div>
}
