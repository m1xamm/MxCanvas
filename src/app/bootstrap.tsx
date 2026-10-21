import { render } from 'preact'
import { App } from './App'
import { isAutosaveDisabled, restoreAutosavedProject, startAutosave } from './autosave'

export async function bootstrapProject(): Promise<void> {
  const rootElement = document.getElementById('app')
  if (!rootElement) throw new Error('Root element #app is missing')
  const autosaveEnabled = !isAutosaveDisabled(window.location.search) && 'indexedDB' in window
  const restored = autosaveEnabled ? await restoreAutosavedProject() : false
  startAutosave(autosaveEnabled, restored)
  if (import.meta.env.DEV) await import('./dev-debug')
  render(<App />, rootElement)
  if (import.meta.env.DEV) {
    void import('./stress-scene').then((module) => module.loadStressSceneFromLocation())
  }
}
