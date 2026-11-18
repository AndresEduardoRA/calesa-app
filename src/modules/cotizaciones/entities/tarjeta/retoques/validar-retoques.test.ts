import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import { bytesComoJsonb } from '../../json-de-la-base'
import { REGLAS_DE_RETOQUES, rechazoDeRetoques, esReglaDeRetoques } from './motivos-de-retoques'
import { validarRetoques } from './validar-retoques'

// El juego que corre también la base (R1 de `supabase/tests/areas/tarjeta/retoques.sql`): el espejo da la misma regla, el mismo donde y el mismo mensaje.
const esquemaDelJuego = z.object({
  plantillas: z.record(
    z.string(),
    z.custom<PlantillaEnCuadricula>((v) => typeof v === 'object'),
  ),
  casos: z
    .array(
      z.union([
        z.strictObject({
          nombre: z.string(),
          plantilla: z.string().nullable(),
          retoques: z.unknown(),
          valida: z.literal(true),
        }),
        z.strictObject({
          nombre: z.string(),
          plantilla: z.string().nullable(),
          retoques: z.unknown(),
          motivo: z.strictObject({ regla: z.enum(REGLAS_DE_RETOQUES), donde: z.string() }),
        }),
      ]),
    )
    .min(1),
  octetos: z.array(z.strictObject({ valor: z.unknown(), bytes: z.int().positive() })).min(1),
})

// En una variable: con el texto literal, Vite cambia `new URL(…, import.meta.url)` por la URL de un recurso.
const RUTA_DEL_JUEGO = './casos-de-retoques.json'
const juego = esquemaDelJuego.parse(
  JSON.parse(readFileSync(new URL(RUTA_DEL_JUEGO, import.meta.url), 'utf8')),
)

const plantillaDe = (nombre: string | null): PlantillaEnCuadricula | null => {
  if (nombre === null) return null
  const p = juego.plantillas[nombre]
  if (p === undefined) throw new Error(`el juego no tiene la plantilla «${nombre}»`)
  return p
}

describe('casos-de-retoques.json', () => {
  it.each(juego.casos)('$nombre', (caso) => {
    const r = validarRetoques(caso.retoques, plantillaDe(caso.plantilla))
    if ('valida' in caso) {
      expect(r).toMatchObject({ ok: true })
      return
    }
    expect(r).toEqual({
      ok: false,
      error: rechazoDeRetoques(caso.motivo.regla, caso.motivo.donde),
    })
  })

  it('cubre las siete reglas y tiene casos válidos', () => {
    const reglas = new Set(juego.casos.flatMap((c) => ('motivo' in c ? [c.motivo.regla] : [])))
    expect([...reglas].sort()).toEqual([...REGLAS_DE_RETOQUES].sort())
    expect(juego.casos.some((c) => 'valida' in c)).toBe(true)
  })

  it.each(juego.octetos)('octetos: $bytes bytes', ({ valor, bytes }) => {
    expect(bytesComoJsonb(valor)).toBe(bytes)
  })
})

describe('validarRetoques', () => {
  const basica = plantillaDe('basica')

  it('devuelve los retoques limpios, sin claves que no vinieron', () => {
    expect(validarRetoques({ celdas: { c_saludo: 'Hola' } }, basica)).toEqual({
      ok: true,
      retoques: { celdas: { c_saludo: 'Hola' } },
    })
    expect(validarRetoques({ filas_ocultas: ['f_nota'] }, basica)).toEqual({
      ok: true,
      retoques: { filas_ocultas: ['f_nota'] },
    })
  })

  it('una propiedad `undefined` es una clave ausente, como la manda JSON', () => {
    expect(validarRetoques({ celdas: undefined, filas_ocultas: ['f_nota'] }, basica)).toEqual({
      ok: true,
      retoques: { filas_ocultas: ['f_nota'] },
    })
  })

  it('cada regla tiene su mensaje, que nombra el id y no el texto', () => {
    for (const regla of REGLAS_DE_RETOQUES) {
      expect(rechazoDeRetoques(regla, 'celdas.c_1').mensaje).toMatch(/\.$/)
    }
    expect(rechazoDeRetoques('celda_inexistente', 'celdas.c_1').mensaje).toBe(
      'La celda «c_1» ya no está en la plantilla.',
    )
    expect(rechazoDeRetoques('fila_repetida', 'filas_ocultas.f_2').mensaje).toBe(
      'La fila «f_2» está dos veces.',
    )
    expect(esReglaDeRetoques('texto_largo')).toBe(true)
    expect(esReglaDeRetoques('forma_rara')).toBe(false)
  })
})
