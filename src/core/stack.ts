export function stackIndexForRow(count: number, row: number): number | null {
  const index = count - 1 - row
  return index < 0 ? null : index
}
