import type { Command } from './commands/command'

export class History {
  #undoStack: Command[] = []
  #redoStack: Command[] = []
  #listeners = new Set<() => void>()

  get canUndo(): boolean {
    return this.#undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.#redoStack.length > 0
  }

  execute(command: Command): void {
    command.execute()
    this.#undoStack.push(command)
    this.#redoStack.length = 0
    this.#notify()
  }

  undo(): void {
    const command = this.#undoStack.pop()
    if (!command) return
    command.undo()
    this.#redoStack.push(command)
    this.#notify()
  }

  redo(): void {
    const command = this.#redoStack.pop()
    if (!command) return
    command.execute()
    this.#undoStack.push(command)
    this.#notify()
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  #notify(): void {
    for (const listener of this.#listeners) listener()
  }
}
