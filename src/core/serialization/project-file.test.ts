import { describe, expect, it } from 'vitest'
import { Document } from '../document/document'
import { createRectangleNode } from '../document/create-node'
import { DEFAULT_DROP_SHADOW } from '../effects'
import { translation } from '../math/matrix'
import {
  PROJECT_FORMAT,
  PROJECT_VERSION,
  ProjectFileError,
  parseProject,
  serializeProject,
  type ProjectErrorCode,
} from './project-file'

const VIEWPORT = { pan: { x: 120, y: -40 }, zoom: 1.5 }

function projectDocument(): Document {
  const document = new Document()
  const parent = createRectangleNode({
    id: 'parent',
    name: 'Frame card',
    x: 20,
    y: 30,
    width: 200,
    height: 120,
  })
  parent.cornerRadius = 12
  parent.opacity = 0.8
  parent.strokes = [{ type: 'solid', color: { r: 20, g: 30, b: 40 }, opacity: 0.6, visible: true }]
  parent.strokeWeight = 3
  parent.strokeAlign = 'outside'
  parent.effects = [DEFAULT_DROP_SHADOW]
  const child = createRectangleNode({
    id: 'child',
    name: 'Badge',
    x: 10,
    y: 10,
    width: 40,
    height: 24,
    parentId: 'parent',
  })
  child.visible = false
  child.locked = true
  document.addNode(parent)
  document.addNode(child)
  return document
}

function expectError(fn: () => unknown, code: ProjectErrorCode): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ProjectFileError)
    expect((error as ProjectFileError).code).toBe(code)
    return
  }
  throw new Error(`Expected ${code}`)
}

function validFile(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    name: 'Landing page',
    viewport: VIEWPORT,
    nodes: [
      {
        id: 'a',
        type: 'rectangle',
        name: 'Card',
        parentId: null,
        transform: translation(10, 20),
        width: 100,
        height: 80,
        visible: true,
        locked: false,
        opacity: 1,
        constrainProportions: false,
        fills: [],
        strokes: [],
        strokeWeight: 1,
        strokeAlign: 'center',
        effects: [],
        cornerRadius: 0,
      },
    ],
    ...overrides,
  })
}

describe('project file serialization', () => {
  it('round-trips a document, name and viewport', () => {
    const document = projectDocument()
    const text = serializeProject(document, 'Landing page', VIEWPORT)
    const parsed = parseProject(text)
    expect(parsed.name).toBe('Landing page')
    expect(parsed.viewport).toEqual(VIEWPORT)
    expect(parsed.nodes.map((node) => node.id)).toEqual(['parent', 'child'])
    const restored = new Document()
    restored.replaceAll(parsed.nodes)
    expect(restored.getRootChildren()).toEqual(['parent'])
    expect(restored.getNode('parent')?.children).toEqual(['child'])
    expect(restored.getNode('child')?.parentId).toBe('parent')
    expect(serializeProject(restored, parsed.name, parsed.viewport)).toBe(text)
  })

  it('keeps paints, effects, alignment and flags', () => {
    const parsed = parseProject(
      serializeProject(projectDocument(), null, { pan: { x: 0, y: 0 }, zoom: 1 }),
    )
    const parent = parsed.nodes[0]!
    expect(parent.opacity).toBe(0.8)
    expect(parent.strokeWeight).toBe(3)
    expect(parent.strokeAlign).toBe('outside')
    expect(parent.effects).toEqual([DEFAULT_DROP_SHADOW])
    expect(parent.strokes[0]?.opacity).toBe(0.6)
    expect(parsed.nodes[1]?.visible).toBe(false)
    expect(parsed.nodes[1]?.locked).toBe(true)
  })

  it('treats a missing name as untitled', () => {
    expect(parseProject(validFile({ name: undefined })).name).toBeNull()
    expect(parseProject(validFile({ name: '   ' })).name).toBeNull()
  })

  it('ignores unknown fields for forward compatibility', () => {
    const parsed = parseProject(validFile({ futureFlag: true }))
    expect(parsed.nodes).toHaveLength(1)
  })
})

describe('project file validation', () => {
  it('rejects malformed JSON', () => {
    expectError(() => parseProject('{'), 'invalidJson')
  })

  it('rejects another format', () => {
    expectError(() => parseProject(validFile({ format: 'figma' })), 'invalidFormat')
  })

  it('rejects newer and invalid versions', () => {
    expectError(() => parseProject(validFile({ version: PROJECT_VERSION + 1 })), 'newerVersion')
    expectError(() => parseProject(validFile({ version: 0 })), 'invalidVersion')
    expectError(() => parseProject(validFile({ version: 1.5 })), 'invalidVersion')
    expectError(() => parseProject(validFile({ version: '1' })), 'invalidVersion')
  })

  it('rejects an unsupported node type', () => {
    const file = JSON.parse(validFile())
    file.nodes[0].type = 'ellipse'
    expectError(() => parseProject(JSON.stringify(file)), 'unsupportedNode')
  })

  it('rejects duplicate ids and unknown parents', () => {
    const file = JSON.parse(validFile())
    file.nodes.push({ ...file.nodes[0] })
    expectError(() => parseProject(JSON.stringify(file)), 'invalidDocument')
    const orphan = JSON.parse(validFile())
    orphan.nodes[0].parentId = 'missing'
    expectError(() => parseProject(JSON.stringify(orphan)), 'invalidDocument')
  })

  it('rejects out-of-range values', () => {
    for (const mutate of [
      (node: Record<string, unknown>) => (node.opacity = 1.5),
      (node: Record<string, unknown>) => (node.strokeWeight = -1),
      (node: Record<string, unknown>) => (node.strokeAlign = 'middle'),
      (node: Record<string, unknown>) => (node.width = 0),
      (node: Record<string, unknown>) => (node.cornerRadius = 1000),
      (node: Record<string, unknown>) => (node.fills = [{ type: 'solid', color: { r: 300, g: 0, b: 0 }, opacity: 1, visible: true }]),
      (node: Record<string, unknown>) => (node.effects = [{ type: 'drop-shadow', color: { r: 0, g: 0, b: 0 }, opacity: 1, offsetX: 0, offsetY: 0, blur: -1, spread: 0, visible: true }]),
    ]) {
      const file = JSON.parse(validFile())
      mutate(file.nodes[0])
      expectError(() => parseProject(JSON.stringify(file)), 'invalidDocument')
    }
  })

  it('rejects an invalid viewport', () => {
    const file = JSON.parse(validFile())
    file.viewport.zoom = 0
    expectError(() => parseProject(JSON.stringify(file)), 'invalidDocument')
  })
})
