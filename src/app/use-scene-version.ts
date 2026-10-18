import { useEffect, useState } from 'preact/hooks'
import { scene } from './editor'

export function useSceneVersion(): number {
  const [version, setVersion] = useState(scene.changeCount)
  useEffect(() => {
    setVersion(scene.changeCount)
    return scene.subscribe(() => setVersion(scene.changeCount))
  }, [])
  return version
}
