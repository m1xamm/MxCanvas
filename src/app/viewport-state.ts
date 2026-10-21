import type { ProjectViewport } from '../core/serialization/project-file'
import { Viewport } from '../core/viewport'

export const projectViewport = new Viewport()

export function applyProjectViewport(viewport: ProjectViewport): void {
  projectViewport.setView(viewport.pan, viewport.zoom)
}

export function currentProjectViewport(): ProjectViewport {
  return { pan: projectViewport.pan, zoom: projectViewport.zoom }
}
