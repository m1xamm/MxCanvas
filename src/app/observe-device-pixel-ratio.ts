export function observeDevicePixelRatio(onChange: () => void): () => void {
  let media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
  const handleChange = () => {
    onChange()
    media.removeEventListener('change', handleChange)
    media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    media.addEventListener('change', handleChange)
  }
  media.addEventListener('change', handleChange)
  return () => {
    media.removeEventListener('change', handleChange)
  }
}
