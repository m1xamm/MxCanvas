import type { Mat2D } from '../math/matrix'

export type NodeId = string

export type NodeType = 'rectangle'

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface SolidPaint {
  type: 'solid'
  color: RgbColor
  opacity: number
}

export type Paint = SolidPaint

export interface SceneNode {
  id: NodeId
  type: NodeType
  name: string
  parentId: NodeId | null
  children: NodeId[]
  transform: Mat2D
  width: number
  height: number
  visible: boolean
  locked: boolean
  opacity: number
}

export interface RectangleNode extends SceneNode {
  type: 'rectangle'
  fills: Paint[]
  cornerRadius: number
}

export type SceneNodeUnion = RectangleNode

export interface SceneReader {
  getRootChildren(): readonly NodeId[]
  getNode(id: NodeId): SceneNodeUnion | undefined
  getWorldTransform(id: NodeId): Mat2D
}
