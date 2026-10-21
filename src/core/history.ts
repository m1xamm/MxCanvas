import type { Command } from './commands/command'

export const MERGE_WINDOW_MS = 500

export interface HistoryOptions {
  now?: () => number
}

export class History {
  #undoStack: Command[] = []
  #redoStack: Command[] = []
  #listeners = new Set<() => void>()
  #now: () => number
  #lastExecuteAt = Number.NEGATIVE_INFINITY

  constructor(options: HistoryOptions = {}) {
    this.#now = options.now ?? Date.now
  }

  get canUndo(): boolean {
    return this.#undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.#redoStack.length > 0
  }

  get undoDepth(): number {
    return this.#undoStack.length
  }

  get redoDepth(): number {
    return this.#redoStack.length
  }

  execute(command: Command): void {
    const now = this.#now()
    const previous = this.#undoStack[this.#undoStack.length - 1]
    if (previous && now - this.#lastExecuteAt <= MERGE_WINDOW_MS && previous.mergeWith?.(command)) {
      this.#lastExecuteAt = now
      this.#redoStack.length = 0
      this.#notify()
      return
    }
    command.execute()
    this.#undoStack.push(command)
    this.#lastExecuteAt = now
    this.#redoStack.length = 0
    this.#notify()
  }

  undo(): void {
    const command = this.#undoStack.pop()
    if (!command) return
    command.undo()
    this.#redoStack.push(command)
    this.#lastExecuteAt = Number.NEGATIVE_INFINITY
    this.#notify()
  }

  redo(): void {
    const command = this.#redoStack.pop()
    if (!command) return
    command.execute()
    this.#undoStack.push(command)
    this.#lastExecuteAt = Number.NEGATIVE_INFINITY
    this.#notify()
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  clear(): void {
    this.#undoStack.length = 0
    this.#redoStack.length = 0
    this.#lastExecuteAt = Number.NEGATIVE_INFINITY
    this.#notify()
  }

  #notify(): void {
    for (const listener of this.#listeners) listener()
  }
}
