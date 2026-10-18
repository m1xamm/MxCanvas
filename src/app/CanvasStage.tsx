import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'
import { CreateNodeCommand } from '../core/commands/create-node-command'
import type { NodeId } from '../core/document/types'
import type { NodeBox } from '../core/transform'
import { Viewport } from '../core/viewport'
import { CanvasController } from '../interaction/canvas-controller'
import { hoveredLayerStore, setHoveredLayer } from '../interaction/layer-list'
import { selectionStore, setSelection } from '../interaction/selection'
import type { ToolId } from '../interaction/tools'
import { Canvas2DRenderer } from '../render/canvas2d-renderer'
import {
  createRectangle,
  deleteSelection,
  history,
  moveSelection,
  nudgeSelection,
  reorderSelection,
  resizeSelection,
  scene,
  toggleSelectionLocked,
  toggleSelectionVisible,
} from './editor'
import { isCanvasGridVisible, subscribeCanvasGrid } from './settings'
import { observeDevicePixelRatio } from './observe-device-pixel-ratio'
import { readViewportArea } from './viewport-area'
import { setViewportActions } from './viewport-actions'
import { setTool, setZoom } from './store'

const NO_PREVIEWS: ReadonlyMap<NodeId, NodeBox> = new Map<NodeId, NodeBox>()

export interface CanvasStageProps {
  tool: ToolId
  inputBlocked: boolean
}

export function CanvasStage({ tool, inputBlocked }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<CanvasController | null>(null)
  const blockedRef = useRef(inputBlocked)

  useLayoutEffect(() => {
    blockedRef.current = inputBlocked
  }, [inputBlocked])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const viewport = new Viewport()
    let controller: CanvasController | null = null
    const renderer = new Canvas2DRenderer(canvas, viewport, {
      scene,
      getSelection: () => selectionStore.get(),
      getHoveredId: () => hoveredLayerStore.get() ?? controller?.hoveredId ?? null,
      getHoveredHandle: () => controller?.hoveredHandle ?? null,
      getMarquee: () => controller?.marquee ?? null,
      getPreviews: () => controller?.previews ?? NO_PREVIEWS,
      getSelectionBounds: () => controller?.selectionBounds ?? null,
      getDraft: () => controller?.draft ?? null,
      isGridVisible: isCanvasGridVisible,
    })
    const createdController = new CanvasController(canvas, viewport, {
      initialTool: tool,
      scene,
      getSelection: () => selectionStore.get(),
      onToolChange: setTool,
      onSelectionChange: setSelection,
      onMoveSelection: moveSelection,
      onNudgeSelection: nudgeSelection,
      onResizeSelection: resizeSelection,
      onDeleteSelection: deleteSelection,
      onCreateRectangle: (bounds) => {
        const node = createRectangle(bounds)
        history.execute(new CreateNodeCommand(scene, node))
        setSelection([node.id])
        setTool('move')
      },
      onDraftChange: () => renderer.requestRender(),
      onOverlayChange: () => renderer.requestRender(),
      onUndo: () => history.undo(),
      onRedo: () => history.redo(),
      onToggleSelectionVisible: toggleSelectionVisible,
      onToggleSelectionLocked: toggleSelectionLocked,
      onReorderSelection: reorderSelection,
      getViewportArea: () => readViewportArea(canvas.clientWidth, canvas.clientHeight),
      isInputBlocked: () => blockedRef.current,
    })
    controller = createdController
    controllerRef.current = createdController
    setViewportActions({
      zoomIn: () => createdController.zoomIn(),
      zoomOut: () => createdController.zoomOut(),
      zoomReset: () => createdController.zoomReset(),
      zoomToFit: () => createdController.zoomToFit(),
      zoomToSelection: () => createdController.zoomToSelection(),
    })

    const resize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height, window.devicePixelRatio)
      renderer.requestRender()
    }

    const unsubscribeViewport = viewport.subscribe(() => {
      renderer.requestRender()
      setZoom(viewport.zoom)
    })
    const unsubscribeScene = scene.subscribe(() => renderer.requestRender())
    const unsubscribeSelection = selectionStore.subscribe(() => renderer.requestRender())
    const unsubscribeCanvasGrid = subscribeCanvasGrid(() => renderer.requestRender())
    const unsubscribeLayerHover = hoveredLayerStore.subscribe(() => renderer.requestRender())
    const clearLayerHover = () => setHoveredLayer(null)
    canvas.addEventListener('pointermove', clearLayerHover)
    canvas.addEventListener('pointerleave', clearLayerHover)
    const stopObservingDpr = observeDevicePixelRatio(resize)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()

    return () => {
      canvas.removeEventListener('pointermove', clearLayerHover)
      canvas.removeEventListener('pointerleave', clearLayerHover)
      unsubscribeLayerHover()
      resizeObserver.disconnect()
      stopObservingDpr()
      unsubscribeViewport()
      unsubscribeScene()
      unsubscribeSelection()
      unsubscribeCanvasGrid()
      setViewportActions(null)
      createdController.dispose()
      renderer.dispose()
      controllerRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    controllerRef.current?.setTool(tool)
  }, [tool])

  return (
    <div class="canvas-stage" ref={containerRef}>
      <canvas class="canvas-surface" ref={canvasRef} />
    </div>
  )
}
