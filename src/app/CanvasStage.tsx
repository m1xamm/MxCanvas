import { useEffect, useRef } from 'preact/hooks'
import { Viewport } from '../core/viewport'
import { CanvasController } from '../interaction/canvas-controller'
import type { ToolId } from '../interaction/tools'
import { Canvas2DRenderer } from '../render/canvas2d-renderer'
import { observeDevicePixelRatio } from './observe-device-pixel-ratio'
import { setTool, setZoom } from './store'

export interface CanvasStageProps {
  tool: ToolId
}

export function CanvasStage({ tool }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<CanvasController | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const viewport = new Viewport()
    const renderer = new Canvas2DRenderer(canvas, viewport)
    const controller = new CanvasController(canvas, viewport, {
      initialTool: tool,
      onToolChange: setTool,
    })
    controllerRef.current = controller

    const resize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height, window.devicePixelRatio)
      renderer.requestRender()
    }

    const unsubscribeViewport = viewport.subscribe(() => {
      renderer.requestRender()
      setZoom(viewport.zoom)
    })
    const stopObservingDpr = observeDevicePixelRatio(resize)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()

    return () => {
      resizeObserver.disconnect()
      stopObservingDpr()
      unsubscribeViewport()
      controller.dispose()
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
