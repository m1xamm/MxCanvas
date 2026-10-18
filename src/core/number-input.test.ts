import { describe, expect, it } from 'vitest'
import { evaluateExpression, formatNumber, parseNumberInput } from './number-input'

describe('evaluateExpression', () => {
  it('parses plain numbers', () => {
    expect(evaluateExpression('100')).toBe(100)
    expect(evaluateExpression(' 12.5 ')).toBe(12.5)
    expect(evaluateExpression('-8')).toBe(-8)
    expect(evaluateExpression('.5')).toBe(0.5)
  })

  it('evaluates arithmetic with precedence', () => {
    expect(evaluateExpression('100+20')).toBe(120)
    expect(evaluateExpression('100 - 20')).toBe(80)
    expect(evaluateExpression('2*3+4')).toBe(10)
    expect(evaluateExpression('4+2*3')).toBe(10)
    expect(evaluateExpression('10/4')).toBe(2.5)
  })

  it('evaluates parentheses and unary signs', () => {
    expect(evaluateExpression('(50*2)/4')).toBe(25)
    expect(evaluateExpression('((2+3)*(3-1))/2')).toBe(5)
    expect(evaluateExpression('100+-20')).toBe(80)
    expect(evaluateExpression('-(5*2)')).toBe(-10)
  })

  it('rejects malformed input', () => {
    expect(evaluateExpression('')).toBeNull()
    expect(evaluateExpression('abc')).toBeNull()
    expect(evaluateExpression('100+')).toBeNull()
    expect(evaluateExpression('(100')).toBeNull()
    expect(evaluateExpression('100)')).toBeNull()
    expect(evaluateExpression('10/0')).toBeNull()
    expect(evaluateExpression('10 20')).toBeNull()
    expect(evaluateExpression('window')).toBeNull()
  })
})

describe('parseNumberInput', () => {
  it('rounds to two decimals', () => {
    expect(parseNumberInput('100.567')).toBe(100.57)
    expect(parseNumberInput('2/3')).toBe(0.67)
  })

  it('returns null for empty and invalid input', () => {
    expect(parseNumberInput('   ')).toBeNull()
    expect(parseNumberInput('nope')).toBeNull()
  })
})

describe('formatNumber', () => {
  it('drops trailing zeros', () => {
    expect(formatNumber(100)).toBe('100')
    expect(formatNumber(100.5)).toBe('100.5')
    expect(formatNumber(-0)).toBe('0')
  })

  it('keeps at most two decimals', () => {
    expect(formatNumber(100.456)).toBe('100.46')
    expect(formatNumber(1.006)).toBe('1.01')
  })

  it('falls back to zero for invalid numbers', () => {
    expect(formatNumber(Number.NaN)).toBe('0')
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('0')
  })
})
