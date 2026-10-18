export interface SwitchProps {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

export function Switch({ checked, label, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      class={checked ? 'control switch is-checked' : 'control switch'}
      onClick={() => onChange(!checked)}
    >
      <span class="switch__thumb" />
    </button>
  )
}
