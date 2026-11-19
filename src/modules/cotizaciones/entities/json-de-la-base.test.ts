import { describe, expect, it } from 'vitest'
import {
  btrim,
  bytesComoJsonb,
  caracteres,
  clavesEnOrdenC,
  compararComoC,
  ES_ID,
  esObjetoJsonb,
  mismoJson,
  tipoJsonb,
} from './json-de-la-base'

// Los `octetos` de cada juego (los que la base comprueba con `octet_length(valor::text)`) los corre el test de su validador: `validar-plantilla.test.ts`,
// `validar-retoques.test.ts`.
describe('bytesComoJsonb', () => {
  it('cuenta como `jsonb::text`: espacios tras la coma y los dos puntos, `{}` y `[]` juntos', () => {
    expect(bytesComoJsonb({ a: [1, 2], b: {} })).toBe('{"a": [1, 2], "b": {}}'.length)
    expect(bytesComoJsonb('ñ')).toBe(4)
  })

  it('el orden de las claves no cambia la cuenta', () => {
    expect(bytesComoJsonb({ b: 1, a: [true] })).toBe(bytesComoJsonb({ a: [true], b: 1 }))
  })
})

describe('caracteres', () => {
  it('cuenta code points, como char_length', () => {
    expect(caracteres('Garantía')).toBe(8)
    expect(caracteres('🚗🚗')).toBe(2)
    // Un emoji con tono de piel son dos code points (no un grafema).
    expect(caracteres('👍🏽')).toBe(2)
    expect(caracteres('')).toBe(0)
  })
})

describe('btrim', () => {
  it('quita sólo espacios de los bordes', () => {
    expect(btrim('  a b  ')).toBe('a b')
    expect(btrim('   ')).toBe('')
    expect(btrim('\t')).toBe('\t')
    expect(btrim(' ')).toBe(' ')
    expect(btrim('\n a')).toBe('\n a')
  })
})

describe('compararComoC', () => {
  const ordenar = (xs: string[]) => [...xs].sort(compararComoC)

  it('ordena por code point, como `collate "C"`', () => {
    expect(ordenar(['a', 'Z'])).toEqual(['Z', 'a'])
    // Por unidades UTF-16 «🚗» (0xD83D…) iría antes que «Ａ» (0xFF21).
    expect(ordenar(['🚗', 'Ａ'])).toEqual(['Ａ', '🚗'])
    expect(ordenar(['ab', 'a', 'b'])).toEqual(['a', 'ab', 'b'])
    expect(compararComoC('x', 'x')).toBe(0)
  })
})

describe('tipoJsonb', () => {
  it('distingue arreglo, objeto, null y ausente', () => {
    expect(tipoJsonb([])).toBe('array')
    expect(tipoJsonb({})).toBe('object')
    expect(tipoJsonb(null)).toBe('null')
    expect(tipoJsonb(undefined)).toBeNull()
    expect(tipoJsonb('x')).toBe('string')
    expect(tipoJsonb(1)).toBe('number')
    expect(tipoJsonb(false)).toBe('boolean')
  })
})

describe('ES_ID', () => {
  it('es la forma de un id de la base, hasta el final del texto', () => {
    expect(ES_ID.test('remate_2')).toBe(true)
    expect(ES_ID.test('a'.repeat(41))).toBe(true)
    expect(ES_ID.test('a'.repeat(42))).toBe(false)
    expect(ES_ID.test('Remate')).toBe(false)
    expect(ES_ID.test('remate\n')).toBe(false)
    expect(ES_ID.test('__proto__')).toBe(false)
  })
})

describe('esObjetoJsonb', () => {
  it('sólo un objeto: ni arreglo ni null', () => {
    expect(esObjetoJsonb({})).toBe(true)
    expect(esObjetoJsonb([])).toBe(false)
    expect(esObjetoJsonb(null)).toBe(false)
    expect(esObjetoJsonb(undefined)).toBe(false)
  })
})

describe('clavesEnOrdenC', () => {
  it('las claves propias en orden C; ausente, ninguna', () => {
    expect(clavesEnOrdenC({ b: 1, a: 1, Z: 1 })).toEqual(['Z', 'a', 'b'])
    expect(
      clavesEnOrdenC(JSON.parse('{"__proto__": 1, "constructor": 2}') as Record<string, unknown>),
    ).toEqual(['__proto__', 'constructor'])
    expect(clavesEnOrdenC(undefined)).toEqual([])
  })
})

describe('mismoJson', () => {
  it('no mira el orden de las claves, ni en objetos anidados', () => {
    expect(
      mismoJson({ a: 1, b: { c: [1, { d: 2, e: 3 }] } }, { b: { c: [1, { e: 3, d: 2 }] }, a: 1 }),
    ).toBe(true)
  })
  it('sí mira los valores, el orden de un arreglo y una clave de más', () => {
    expect(mismoJson({ a: 1 }, { a: 2 })).toBe(false)
    expect(mismoJson([1, 2], [2, 1])).toBe(false)
    expect(mismoJson({ a: 1 }, { a: 1, b: undefined })).toBe(true)
    expect(mismoJson({ a: 1 }, { a: 1, b: null })).toBe(false)
  })
  it('con claves como «__proto__» y «constructor»', () => {
    expect(
      mismoJson(
        JSON.parse('{"__proto__": 1, "constructor": 2}'),
        JSON.parse('{"constructor": 2, "__proto__": 1}'),
      ),
    ).toBe(true)
  })
})
