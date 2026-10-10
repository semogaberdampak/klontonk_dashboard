import { describe, expect, it } from 'vitest'
import { bersihkanKataKunci, parseOffset } from './query'

describe('bersihkanKataKunci', () => {
  it('membuang karakter yang merusak filter PostgREST', () => {
    expect(bersihkanKataKunci('a(b),c*d%e\\f')).toBe('a b  c d e f')
  })

  it('aman untuk null dan undefined', () => {
    expect(bersihkanKataKunci(null)).toBe('')
    expect(bersihkanKataKunci(undefined)).toBe('')
  })

  it('memangkas spasi tepi', () => {
    expect(bersihkanKataKunci('  warung  ')).toBe('warung')
  })
})

describe('parseOffset', () => {
  it.each([
    [null, 0],
    ['25', 25],
    ['-5', 0],
    ['abc', 0],
    ['12.9', 12]
  ])('parseOffset(%s) = %s', (input, expected) => {
    expect(parseOffset(input)).toBe(expected)
  })
})
