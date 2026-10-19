import type { SceneNodeUnion, DropShadowEffect } from './document/types'
import { sameRgb } from './color'
import { stackIndexForRow } from './stack'

export interface EffectSummary {
  row: number
  effect: DropShadowEffect
  mixedColor: boolean
  mixedOpacity: boolean
  mixedVisible: boolean
  mixedOffsetX: boolean
  mixedOffsetY: boolean
  mixedBlur: boolean
  mixedSpread: boolean
}

export const DEFAULT_DROP_SHADOW: DropShadowEffect = {
  type: 'drop-shadow',
  color: { r: 0, g: 0, b: 0 },
  opacity: 0.25,
  offsetX: 0,
  offsetY: 4,
  blur: 4,
  spread: 0,
  visible: true,
}

export function cloneEffect(effect: DropShadowEffect): DropShadowEffect {
  return { ...effect, color: { ...effect.color } }
}

export function cloneEffects(effects: readonly DropShadowEffect[]): DropShadowEffect[] {
  return effects.map(cloneEffect)
}

export function summarizeEffects(nodes: readonly SceneNodeUnion[]): EffectSummary[] {
  if (nodes.length === 0) return []
  const rowCount = nodes.reduce((count, node) => Math.max(count, node.effects.length), 0)
  const summaries: EffectSummary[] = []
  for (let row = 0; row < rowCount; row += 1) {
    const effects = collectEffects(nodes, row)
    const effect = effects[0]
    if (!effect) continue
    summaries.push({
      row,
      effect,
      mixedColor: effects.some((candidate) => !sameRgb(candidate.color, effect.color)),      mixedOpacity: effects.some((candidate) => candidate.opacity !== effect.opacity),
      mixedVisible: effects.some((candidate) => candidate.visible !== effect.visible),
      mixedOffsetX: effects.some((candidate) => candidate.offsetX !== effect.offsetX),
      mixedOffsetY: effects.some((candidate) => candidate.offsetY !== effect.offsetY),
      mixedBlur: effects.some((candidate) => candidate.blur !== effect.blur),
      mixedSpread: effects.some((candidate) => candidate.spread !== effect.spread),
    })
  }
  return summaries
}

function collectEffects(nodes: readonly SceneNodeUnion[], row: number): DropShadowEffect[] {
  const effects: DropShadowEffect[] = []
  let primary: DropShadowEffect | null = null
  nodes.forEach((node, index) => {
    const effectIndex = stackIndexForRow(node.effects.length, row)
    const effect = effectIndex === null ? undefined : node.effects[effectIndex]
    if (!effect) return
    if (index === 0) primary = effect
    effects.push(effect)
  })
  return primary ? [primary, ...effects.filter((effect) => effect !== primary)] : effects
}
