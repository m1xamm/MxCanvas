const MAX_DECIMALS = 2
const DECIMAL_FACTOR = 10 ** MAX_DECIMALS
const NUMBER_TOKEN = /^[\d.]+$/

const TOKEN = /\s*(\d*\.?\d*|[()+\-*/])/y

export function formatNumber(value: number, maxDecimals = MAX_DECIMALS): string {
  if (!Number.isFinite(value)) return '0'
  const factor = 10 ** maxDecimals
  const rounded = Math.round(value * factor) / factor
  return String(rounded === 0 ? 0 : rounded)
}

export function parseNumberInput(input: string): number | null {
  const value = evaluateExpression(input)
  if (value === null) return null
  return Math.round(value * DECIMAL_FACTOR) / DECIMAL_FACTOR
}

export function evaluateExpression(expression: string): number | null {
  const parser = new ExpressionParser(expression)
  const value = parser.parseExpression()
  if (value === null || !Number.isFinite(value) || !parser.done) return null
  return value
}

class ExpressionParser {
  #source: string
  #index = 0

  constructor(source: string) {
    this.#source = source
  }

  get done(): boolean {
    return this.#source.slice(this.#index).trim() === ''
  }

  parseExpression(): number | null {
    let value = this.parseTerm()
    if (value === null) return null
    while (true) {
      this.#skipSpaces()
      const operator = readOperator(this.#source, this.#index)
      if (operator !== '+' && operator !== '-') return value
      this.#index += 1
      const right = this.parseTerm()
      if (right === null) return null
      value = operator === '+' ? value + right : value - right
    }
  }

  parseTerm(): number | null {
    let value = this.parseFactor()
    if (value === null) return null
    while (true) {
      this.#skipSpaces()
      const operator = readOperator(this.#source, this.#index)
      if (operator !== '*' && operator !== '/') return value
      this.#index += 1
      const right = this.parseFactor()
      if (right === null || (operator === '/' && right === 0)) return null
      value = operator === '*' ? value * right : value / right
    }
  }

  parseFactor(): number | null {
    this.#skipSpaces()
    const operator = readOperator(this.#source, this.#index)
    if (operator === '-' || operator === '+') {
      this.#index += 1
      const value = this.parseFactor()
      if (value === null) return null
      return operator === '-' ? -value : value
    }
    return this.parsePrimary()
  }

  parsePrimary(): number | null {
    this.#skipSpaces()
    if (this.#source[this.#index] === '(') {
      this.#index += 1
      const value = this.parseExpression()
      this.#skipSpaces()
      if (value === null || this.#source[this.#index] !== ')') return null
      this.#index += 1
      return value
    }
    const match = this.#nextToken()
    if (!match) return null
    const token = match[1] ?? ''
    if (!NUMBER_TOKEN.test(token) || token === '.') return null
    this.#index += match[0].length
    return Number(token)
  }

  #nextToken(): RegExpExecArray | null {
    TOKEN.lastIndex = this.#index
    const match = TOKEN.exec(this.#source)
    return match && match.index === this.#index ? match : null
  }

  #skipSpaces(): void {
    while (this.#source[this.#index] === ' ') this.#index += 1
  }
}

function readOperator(source: string, index: number): string | null {
  const char = source[index]
  return char === '*' || char === '/' || char === '+' || char === '-' ? char : null
}
