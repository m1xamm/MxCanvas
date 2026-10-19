import type { Document } from '../document/document'
import { cloneEffects } from '../effects'
import type { DropShadowEffect, NodeId, SceneNodeUnion } from '../document/types'
import type { Command } from './command'
import { applyNodePropertyChanges, mergeNodePropertyChanges, type NodePropertyChange } from './node-property-change'

export interface SetEffectsCommandOptions {
  mergeable?: boolean
}

export class SetEffectsCommand implements Command {
  readonly label = 'set effects'
  #document: Document
  #mergeable: boolean
  #changes: NodePropertyChange<DropShadowEffect[]>[]

  constructor(
    document: Document,
    changes: readonly NodePropertyChange<DropShadowEffect[]>[],
    options: SetEffectsCommandOptions = {},
  ) {
    this.#document = document
    this.#mergeable = options.mergeable ?? false
    this.#changes = changes.map((change) => ({
      id: change.id,
      from: cloneEffects(change.from),
      to: cloneEffects(change.to),
    }))
  }

  static forNodes(
    document: Document,
    ids: readonly NodeId[],
    effects: (node: SceneNodeUnion) => DropShadowEffect[],
    options: SetEffectsCommandOptions = {},
  ): SetEffectsCommand | null {
    const changes: NodePropertyChange<DropShadowEffect[]>[] = []
    for (const id of ids) {
      const node = document.getNode(id)
      if (!node) continue
      changes.push({ id, from: node.effects, to: effects(node) })
    }
    return changes.length === 0 ? null : new SetEffectsCommand(document, changes, options)
  }

  execute(): void {
    this.#apply('to')
  }

  undo(): void {
    this.#apply('from')
  }

  mergeWith(next: Command): boolean {
    if (!this.#mergeable || !(next instanceof SetEffectsCommand) || !next.#mergeable) return false
    if (!mergeNodePropertyChanges(this.#changes, next.#changes)) return false
    this.execute()
    return true
  }

  #apply(side: 'from' | 'to'): void {
    applyNodePropertyChanges(this.#document, this.#changes, side, (document, id, value) => {
      document.setNodeEffects(id, value)
    })
  }
}
