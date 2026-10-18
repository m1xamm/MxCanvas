import { iconMarkup, type IconName } from './icons'

export const DEFAULT_ICON_SIZE = 20

const MATERIAL_VIEW_BOX = '0 -960 960 960'

export interface IconProps {
  name: IconName
  size?: number
  filled?: boolean
}

export function Icon({ name, size = DEFAULT_ICON_SIZE, filled = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MATERIAL_VIEW_BOX}
      fill="currentColor"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: iconMarkup(name, filled) }}
    />
  )
}
