import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { casosDeConversionComoTexto, generarCasosDeConversion } from './casos-de-conversion.soporte'
import { juegoDePlantilla, RUTA_DEL_JUEGO } from './juego-de-plantilla.soporte'
import { validarPlantilla } from './validar-plantilla'

// El juego espejo de la conversión: el archivo es el que genera `convertirPlantilla()` (si está viejo, cae) y cada caso sale válido contra su fórmula. Como
// `cotizacion_tarjeta`, la forma 1 se valida sin el catálogo (un color borrado cae al del grupo).
const CASOS = join(dirname(fileURLToPath(import.meta.url)), 'casos-de-conversion.json')
const REGENERAR =
  'ACTUALIZAR_CASOS=1 pnpm vitest run src/modules/cotizaciones/entities/plantilla/casos-de-conversion.test.ts'
const juego = juegoDePlantilla(readFileSync(new URL(RUTA_DEL_JUEGO, import.meta.url), 'utf8'))

describe('casos-de-conversion.json', () => {
  it('el archivo es el que genera convertirPlantilla()', () => {
    if (process.env['ACTUALIZAR_CASOS'] === '1')
      writeFileSync(CASOS, casosDeConversionComoTexto(juego))
    expect(existsSync(CASOS), `falta el juego: ${REGENERAR}`).toBe(true)
    expect(readFileSync(CASOS, 'utf8'), `juego viejo: ${REGENERAR}`).toBe(
      casosDeConversionComoTexto(juego),
    )
  })

  const { formulas, casos } = generarCasosDeConversion(juego)
  it.each(casos)('$nombre: la forma 1 es válida y lo convertido también, sin el tope', (c) => {
    const fo = formulas[c.formula]
    if (fo === undefined) throw new Error(c.formula)
    const contexto = { ...fo, visibilidad: c.visibilidad ?? fo.visibilidad, tonos: null }
    expect(validarPlantilla(c.plantilla, contexto).ok).toBe(true)
    const r = validarPlantilla(c.esperada, contexto, { conTope: false })
    expect(r.ok ? 'válida' : `${r.error.regla}@${r.error.donde}`).toBe('válida')
  })
})
