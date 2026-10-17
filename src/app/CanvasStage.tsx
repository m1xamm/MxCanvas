import { useEffect, useRef } from 'preact/hooks'
import { CreateNodeCommand } from '../core/commands/create-node-command'
import { Viewport } from '../core/viewport'
import { CanvasController } from '../interaction/canvas-controller'
import { selectionStore, setSelection } from '../interaction/selection'
import type { ToolId } from '../interaction/tools'
import { Canvas2DRenderer } from '../render/canvas2d-renderer'
import { createRectangle, history, scene } from './editor'
import { observeDevicePixelRatio } from './observe-device-pixel-ratio'
import { setTool, setZoom } from './store'

export interface CanvasStageProps {
  tool: ToolId
  inputBlocked: boolean
}

export function CanvasStage({ tool, inputBlocked }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<CanvasController | null>(null)
  const blockedRef = useRef(inputBlocked)

  useEffect(() => {
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
      getDraft: () => controller?.draft ?? null,
    })
    const createdController = new CanvasController(canvas, viewport, {
      initialTool: tool,
      onToolChange: setTool,
      onCreateRectangle: (bounds) => {
        const node = createRectangle(bounds)
        history.execute(new CreateNodeCommand(scene, node))
        setSelection([node.id])
        setTool('move')
      },
      onDraftChange: () => renderer.requestRender(),
      onUndo: () => history.undo(),
      onRedo: () => history.redo(),
      isInputBlocked: () => blockedRef.current,
    })
    controller = createdController
    controllerRef.current = createdController

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
    const stopObservingDpr = observeDevicePixelRatio(resize)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()

    return () => {
      resizeObserver.disconnect()
      stopObservingDpr()
      unsubscribeViewport()
      unsubscribeScene()
      unsubscribeSelection()
      createdController.dispose()
      renderer.dispose()
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    controllerRef.current?.setTool(tool)
  }, [tool])

  return (
    <div class="canvas-stage" ref={containerRef}>
      <canvas class="canvas-surface" ref={canvasRef} />
    </div>
  )
}
