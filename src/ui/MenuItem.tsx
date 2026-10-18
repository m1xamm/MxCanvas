import type { JSX } from 'preact'

export interface MenuItemProps {
  icon?: () => JSX.Element
  label: string
  hotkey?: string
  disabled?: boolean
  onClick: () => void
}

export function MenuItem({ icon: Icon, label, hotkey, disabled, onClick }: MenuItemProps) {
  const className = Icon ? 'control menu-item' : 'control menu-item menu-item--plain'
  return (
    <button type="button" role="menuitem" class={className} disabled={disabled} onClick={onClick}>
      {Icon && (
        <span class="menu-item__icon">
          <Icon />
        </span>
      )}
      <span class="menu-item__label">{label}</span>
      {hotkey && <span class="menu-item__hotkey">{hotkey}</span>}
    </button>
  )
}
