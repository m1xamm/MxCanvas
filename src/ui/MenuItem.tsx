import { Icon } from './Icon'
import type { IconName } from './icons'

export interface MenuItemProps {
  icon?: IconName
  label: string
  hotkey?: string
  disabled?: boolean
  onClick: () => void
}

export function MenuItem({ icon, label, hotkey, disabled, onClick }: MenuItemProps) {
  const className = icon ? 'control menu-item' : 'control menu-item menu-item--plain'
  return (
    <button type="button" role="menuitem" class={className} disabled={disabled} onClick={onClick}>
      {icon && (
        <span class="menu-item__icon">
          <Icon name={icon} />
        </span>
      )}
      <span class="menu-item__label">{label}</span>
      {hotkey && <span class="menu-item__hotkey">{hotkey}</span>}
    </button>
  )
}
