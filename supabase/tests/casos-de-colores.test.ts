import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTRASTE_AA, contraste } from '@/shared/lib/color'
import { EXTREMOS, MINIMO_DE_CASOS, casosComoTexto, generarCasos } from './casos-de-colores'

const CASOS = 'supabase/tests/casos-de-colores.json'
const REGENERAR = 'ACTUALIZAR_CASOS=1 pnpm vitest run supabase/tests/casos-de-colores.test.ts'

describe('juego espejo de los colores', () => {
  it('el archivo es el que genera colores.ts', () => {
    if (process.env['ACTUALIZAR_CASOS'] === '1') writeFileSync(CASOS, casosComoTexto())
    expect(existsSync(CASOS), `falta el juego: ${REGENERAR}`).toBe(true)
    expect(readFileSync(CASOS, 'utf8'), `juego viejo: ${REGENERAR}`).toBe(casosComoTexto())
  })

  it('trae los extremos y al menos 300 casos, cada uno con AA en claro y en oscuro', () => {
    const { casos } = generarCasos()
    expect(casos.length).toBeGreaterThanOrEqual(MINIMO_DE_CASOS)
    const hexes = new Set(casos.map((c) => c.hex))
    for (const extremo of EXTREMOS) expect(hexes.has(extremo)).toBe(true)
    for (const { colores } of casos) {
      expect(contraste(colores.claro.tinta, colores.claro.fondo)).toBeGreaterThanOrEqual(
        CONTRASTE_AA,
      )
      expect(contraste(colores.oscuro.tinta, colores.oscuro.fondo)).toBeGreaterThanOrEqual(
        CONTRASTE_AA,
      )
    }
    // Las dos ramas del texto de la tarjeta y del aviso.
    expect(casos.some((c) => c.tintaDeLaTarjeta === c.colores.claro.tinta)).toBe(true)
    expect(casos.some((c) => c.tintaDeLaTarjeta !== c.colores.claro.tinta)).toBe(true)
    expect(casos.some((c) => c.avisoDeLaTarjeta)).toBe(true)
    expect(casos.some((c) => !c.avisoDeLaTarjeta)).toBe(true)
  })
})
