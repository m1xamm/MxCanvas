import type { SceneNodeUnion, SceneReader } from '../document/types'
import type { Vec2 } from '../math/matrix'
import { MAX_STROKE_WEIGHT } from '../document/document'
import { MAX_ZOOM, MIN_ZOOM } from '../viewport'

export const PROJECT_FORMAT = 'mxcanvas'
export const PROJECT_VERSION = 1
export const PROJECT_EXTENSION = '.mxc'
export const MAX_PROJECT_BYTES = 20 * 1024 * 1024
export const MAX_PROJECT_NODES = 50_000
export const MAX_PROJECT_DEPTH = 256
export const MAX_PROJECT_NAME_LENGTH = 200
export const MAX_NODE_NAME_LENGTH = 200
export const MAX_PAINTS = 1_000
export const MAX_EFFECTS = 1_000
export const MAX_NODE_SIZE = 1_000_000

export interface ProjectViewport {
  pan: Vec2
  zoom: number
}

export interface ProjectSnapshot {
  version: number
  name: string | null
  viewport: ProjectViewport
  nodes: SceneNodeUnion[]
}

export type ProjectErrorCode =
  | 'invalidJson'
  | 'invalidFormat'
  | 'invalidVersion'
  | 'newerVersion'
  | 'fileTooLarge'
  | 'invalidDocument'
  | 'unsupportedNode'

export class ProjectFileError extends Error {
  readonly code: ProjectErrorCode
  readonly detail: string

  constructor(code: ProjectErrorCode, detail = '') {
    super(detail === '' ? code : `${code}: ${detail}`)
    this.name = 'ProjectFileError'
    this.code = code
    this.detail = detail
  }
}

interface RawRecord {
  [key: string]: unknown
}

type ProjectMigration = (source: RawRecord) => RawRecord

const MIGRATIONS = new Map<number, ProjectMigration>()

export function serializeProject(
  document: SceneReader,
  name: string | null,
  viewport: ProjectViewport,
): string {
  const nodes: ReturnType<typeof serializeNode>[] = []
  const visit = (id: string) => {
    const node = document.getNode(id)
    if (!node) return
    nodes.push(serializeNode(node))
    for (const childId of node.children) visit(childId)
  }
  for (const rootId of document.getRootChildren()) visit(rootId)
  return JSON.stringify(
    {
      format: PROJECT_FORMAT,
      version: PROJECT_VERSION,
      name,
      viewport: { pan: { x: viewport.pan.x, y: viewport.pan.y }, zoom: viewport.zoom },
      nodes,
    },
    null,
    2,
  )
}

export function parseProject(text: string): ProjectSnapshot {
  if (text.length > MAX_PROJECT_BYTES) throw new ProjectFileError('fileTooLarge')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ProjectFileError('invalidJson')
  }
  const file = readRecord(raw, 'file')
  if (file.format !== PROJECT_FORMAT) throw new ProjectFileError('invalidFormat')
  const version = readVersion(file.version)
  const migrated = migrate(file, version)
  return {
    version: PROJECT_VERSION,
    name: readName(migrated.name),
    viewport: readViewport(migrated.viewport),
    nodes: readNodes(migrated.nodes),
  }
}

function serializeNode(node: SceneNodeUnion) {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    parentId: node.parentId,
    transform: { ...node.transform },
    width: node.width,
    height: node.height,
    visible: node.visible,
    locked: node.locked,
    opacity: node.opacity,
    constrainProportions: node.constrainProportions,
    fills: node.fills,
    strokes: node.strokes,
    strokeWeight: node.strokeWeight,
    strokeAlign: node.strokeAlign,
    effects: node.effects,
    cornerRadius: node.cornerRadius,
  }
}

function readVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ProjectFileError('invalidVersion')
  }
  if (value > PROJECT_VERSION) throw new ProjectFileError('newerVersion')
  return value
}

function migrate(file: RawRecord, version: number): RawRecord {
  let current = file
  for (let from = version; from < PROJECT_VERSION; from += 1) {
    const migration = MIGRATIONS.get(from)
    if (!migration) throw new ProjectFileError('invalidVersion')
    current = migration(current)
  }
  return current
}

function readName(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw invalid('name')
  const name = value.trim()
  if (name.length > MAX_PROJECT_NAME_LENGTH) throw invalid('name')
  return name === '' ? null : name
}

function readViewport(value: unknown): ProjectViewport {
  const viewport = readRecord(value, 'viewport')
  const pan = readRecord(viewport.pan, 'viewport.pan')
  const x = readFinite(pan.x, 'viewport.pan.x')
  const y = readFinite(pan.y, 'viewport.pan.y')
  const zoom = readFinite(viewport.zoom, 'viewport.zoom')
  if (zoom < MIN_ZOOM || zoom > MAX_ZOOM) throw invalid('viewport.zoom')
  return { pan: { x, y }, zoom }
}

function readNodes(value: unknown): SceneNodeUnion[] {
  if (!Array.isArray(value)) throw invalid('nodes')
  if (value.length > MAX_PROJECT_NODES) throw new ProjectFileError('fileTooLarge')
  const nodes: SceneNodeUnion[] = []
  const byId = new Map<string, SceneNodeUnion>()
  const depths = new Map<string, number>()
  value.forEach((entry, index) => {
    const node = readNode(entry, index, byId, depths)
    byId.set(node.id, node)
    nodes.push(node)
  })
  return nodes
}

function readNode(
  value: unknown,
  index: number,
  byId: Map<string, SceneNodeUnion>,
  depths: Map<string, number>,
): SceneNodeUnion {
  const path = `nodes[${index}]`
  const raw = readRecord(value, path)
  if (raw.type !== 'rectangle') throw new ProjectFileError('unsupportedNode', path)
  const id = readId(raw.id, `${path}.id`)
  if (byId.has(id)) throw invalid(`${path}.id`)
  const parentId = readParentId(raw.parentId, `${path}.parentId`)
  const depth = parentId === null ? 0 : (depths.get(parentId) ?? 0) + 1
  if (parentId !== null && !byId.has(parentId)) throw invalid(`${path}.parentId`)
  if (depth > MAX_PROJECT_DEPTH) throw invalid(`${path}.parentId`)
  const name = readNodeName(raw.name, `${path}.name`)
  const transform = readTransform(raw.transform, `${path}.transform`)
  const width = readDimension(raw.width, `${path}.width`)
  const height = readDimension(raw.height, `${path}.height`)
  const cornerRadius = readCornerRadius(raw.cornerRadius, width, height, `${path}.cornerRadius`)
  const node = {
    id,
    type: 'rectangle' as const,
    name,
    parentId,
    children: [],
    transform,
    width,
    height,
    visible: readBoolean(raw.visible, `${path}.visible`),
    locked: readBoolean(raw.locked, `${path}.locked`),
    opacity: readUnit(raw.opacity, `${path}.opacity`),
    constrainProportions: readBoolean(raw.constrainProportions, `${path}.constrainProportions`),
    fills: readPaints(raw.fills, `${path}.fills`),
    strokes: readPaints(raw.strokes, `${path}.strokes`),
    strokeWeight: readStrokeWeight(raw.strokeWeight, `${path}.strokeWeight`),
    strokeAlign: readStrokeAlign(raw.strokeAlign, `${path}.strokeAlign`),
    effects: readEffects(raw.effects, `${path}.effects`),
    cornerRadius,
  }
  depths.set(id, depth)
  if (parentId !== null) byId.get(parentId)?.children.push(id)
  return node
}

function readId(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200) throw invalid(path)
  return value
}

function readParentId(value: unknown, path: string): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || value.length === 0) throw invalid(path)
  return value
}

function readNodeName(value: unknown, path: string): string {
  if (typeof value !== 'string') throw invalid(path)
  const name = value.trim()
  if (name.length === 0 || name.length > MAX_NODE_NAME_LENGTH) throw invalid(path)
  return name
}

function readTransform(value: unknown, path: string) {
  const raw = readRecord(value, path)
  return {
    a: readFinite(raw.a, `${path}.a`),
    b: readFinite(raw.b, `${path}.b`),
    c: readFinite(raw.c, `${path}.c`),
    d: readFinite(raw.d, `${path}.d`),
    e: readFinite(raw.e, `${path}.e`),
    f: readFinite(raw.f, `${path}.f`),
  }
}

function readDimension(value: unknown, path: string): number {
  const number = readFinite(value, path)
  if (number <= 0 || number > MAX_NODE_SIZE) throw invalid(path)
  return number
}

function readCornerRadius(value: unknown, width: number, height: number, path: string): number {
  const radius = readFinite(value, path)
  if (radius < 0 || radius > Math.min(width, height) / 2) throw invalid(path)
  return radius
}

function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw invalid(path)
  return value
}

function readUnit(value: unknown, path: string): number {
  const number = readFinite(value, path)
  if (number < 0 || number > 1) throw invalid(path)
  return number
}

function readStrokeWeight(value: unknown, path: string): number {
  const weight = readFinite(value, path)
  if (weight < 0 || weight > MAX_STROKE_WEIGHT) throw invalid(path)
  return weight
}

function readStrokeAlign(value: unknown, path: string): 'inside' | 'center' | 'outside' {
  if (value !== 'inside' && value !== 'center' && value !== 'outside') throw invalid(path)
  return value
}

function readPaints(value: unknown, path: string) {
  if (!Array.isArray(value)) throw invalid(path)
  if (value.length > MAX_PAINTS) throw invalid(path)
  return value.map((entry, index) => {
    const raw = readRecord(entry, `${path}[${index}]`)
    if (raw.type !== 'solid') throw invalid(`${path}[${index}].type`)
    return {
      type: 'solid' as const,
      color: readColor(raw.color, `${path}[${index}].color`),
      opacity: readUnit(raw.opacity, `${path}[${index}].opacity`),
      visible: readBoolean(raw.visible, `${path}[${index}].visible`),
    }
  })
}

function readEffects(value: unknown, path: string) {
  if (!Array.isArray(value)) throw invalid(path)
  if (value.length > MAX_EFFECTS) throw invalid(path)
  return value.map((entry, index) => {
    const item = `${path}[${index}]`
    const raw = readRecord(entry, item)
    if (raw.type !== 'drop-shadow') throw invalid(`${item}.type`)
    return {
      type: 'drop-shadow' as const,
      color: readColor(raw.color, `${item}.color`),
      opacity: readUnit(raw.opacity, `${item}.opacity`),
      offsetX: readFinite(raw.offsetX, `${item}.offsetX`),
      offsetY: readFinite(raw.offsetY, `${item}.offsetY`),
      blur: readNonNegative(raw.blur, `${item}.blur`),
      spread: readFinite(raw.spread, `${item}.spread`),
      visible: readBoolean(raw.visible, `${item}.visible`),
    }
  })
}

function readColor(value: unknown, path: string) {
  const raw = readRecord(value, path)
  return {
    r: readChannel(raw.r, `${path}.r`),
    g: readChannel(raw.g, `${path}.g`),
    b: readChannel(raw.b, `${path}.b`),
  }
}

function readChannel(value: unknown, path: string): number {
  const channel = readFinite(value, path)
  if (channel < 0 || channel > 255) throw invalid(path)
  return channel
}

function readNonNegative(value: unknown, path: string): number {
  const number = readFinite(value, path)
  if (number < 0) throw invalid(path)
  return number
}

function readRecord(value: unknown, path: string): RawRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw invalid(path)
  return value as RawRecord
}

function readFinite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw invalid(path)
  return value
}

function invalid(path: string): ProjectFileError {
  return new ProjectFileError('invalidDocument', path)
}
