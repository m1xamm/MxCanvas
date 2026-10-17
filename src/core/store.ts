type Listener<T> = (value: T) => void

export class Store<T> {
  #value: T
  #listeners = new Set<Listener<T>>()

  constructor(initialValue: T) {
    this.#value = initialValue
  }

  get(): T {
    return this.#value
  }

  set(value: T): void {
    if (value === this.#value) return
    this.#value = value
    for (const listener of this.#listeners) listener(value)
  }

  subscribe(listener: Listener<T>): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }
}
