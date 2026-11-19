import { describe, expect, it } from 'vitest'
import { cierreDeLaSubasta, etiquetaDeLaPuja, fraseDeSubasta } from './frase-de-subasta'

const AHORA = new Date('2026-11-18T12:00:00.000Z')
const EN = (horas: number) => new Date(AHORA.getTime() + horas * 3_600_000).toISOString()
const SIN = { subastaEn: null, subastaFinEn: null }

describe('la frase de la subasta', () => {
  it('en subasta, con el cierre por venir: «Se subasta en …» con la cuenta de siempre', () => {
    expect(
      fraseDeSubasta({
        situacion: 'en_subasta',
        subastaEn: EN(52),
        subastaFinEn: null,
        ahora: AHORA,
      }),
    ).toEqual({ texto: 'Se subasta en 2 días 4 h', tono: 'info', icono: 'reloj' })
  })

  it('el cierre es el fin si lo hay, si no el inicio', () => {
    expect(cierreDeLaSubasta({ subastaEn: EN(1), subastaFinEn: EN(5) })).toBe(EN(5))
    expect(cierreDeLaSubasta({ subastaEn: EN(1), subastaFinEn: null })).toBe(EN(1))
    expect(
      fraseDeSubasta({
        situacion: 'en_subasta',
        subastaEn: EN(-1),
        subastaFinEn: EN(3),
        ahora: AHORA,
      }).texto,
    ).toBe('Se subasta en 3 h')
  })

  it('en subasta con el cierre vencido (el job todavía no corrió): «Cerró hace …»', () => {
    expect(
      fraseDeSubasta({
        situacion: 'en_subasta',
        subastaEn: EN(-0.1),
        subastaFinEn: null,
        ahora: AHORA,
      }).texto,
    ).toBe('Cerró hace 6 min')
  })

  it('sin resolver: «Cerró hace … · sin resolver», con aviso', () => {
    expect(
      fraseDeSubasta({
        situacion: 'sin_resolver',
        subastaEn: EN(-3),
        subastaFinEn: null,
        ahora: AHORA,
      }),
    ).toEqual({ texto: 'Cerró hace 3 h · sin resolver', tono: 'aviso', icono: 'alerta' })
  })

  it('ganada: ya en una fase tras la subasta, con el cierre vencido', () => {
    expect(
      fraseDeSubasta({ situacion: 'fase', subastaEn: EN(-48), subastaFinEn: null, ahora: AHORA }),
    ).toEqual({ texto: 'Ganada', tono: 'exito', icono: 'ganada' })
  })

  it('en una fase con el cierre por venir: la cuenta, sin el color de éxito', () => {
    expect(
      fraseDeSubasta({ situacion: 'fase', subastaEn: EN(2), subastaFinEn: null, ahora: AHORA }),
    ).toEqual({ texto: 'Se subasta en 2 h', tono: 'neutro', icono: 'reloj' })
  })
})

describe('la frase de la subasta, sin cuenta', () => {
  it('no ganada', () => {
    expect(fraseDeSubasta({ situacion: 'no_ganada', ...SIN, ahora: AHORA })).toEqual({
      texto: 'No ganada',
      tono: 'apagado',
      icono: 'no_ganada',
    })
  })

  it('sin fechas', () => {
    expect(fraseDeSubasta({ situacion: 'en_subasta', ...SIN, ahora: AHORA }).texto).toBe(
      'En subasta · sin fecha de cierre',
    )
    expect(fraseDeSubasta({ situacion: 'sin_resolver', ...SIN, ahora: AHORA }).texto).toBe(
      'Cerró · sin resolver',
    )
    expect(fraseDeSubasta({ situacion: 'fase', ...SIN, ahora: AHORA }).texto).toBe(
      'Sin fecha de cierre',
    )
  })

  it('una fecha que no se entiende cuenta como sin fecha: nunca «NaN» en el texto', () => {
    for (const situacion of ['en_subasta', 'sin_resolver', 'no_ganada', 'fase'] as const) {
      const frase = fraseDeSubasta({
        situacion,
        subastaEn: 'no es una fecha',
        subastaFinEn: null,
        ahora: AHORA,
      })
      expect(frase.texto).not.toMatch(/NaN|undefined/)
    }
  })
})

describe('la etiqueta de la puja', () => {
  it('«Puja actual» mientras sigue viva; «Puja final» si cerró', () => {
    expect(etiquetaDeLaPuja('en_subasta', { subastaEn: EN(2), subastaFinEn: null }, AHORA)).toBe(
      'Puja actual',
    )
    expect(etiquetaDeLaPuja('en_subasta', SIN, AHORA)).toBe('Puja actual')
    expect(etiquetaDeLaPuja('en_subasta', { subastaEn: EN(-2), subastaFinEn: null }, AHORA)).toBe(
      'Puja final',
    )
    expect(etiquetaDeLaPuja('sin_resolver', SIN, AHORA)).toBe('Puja final')
    expect(etiquetaDeLaPuja('fase', { subastaEn: EN(-2), subastaFinEn: null }, AHORA)).toBe(
      'Puja final',
    )
  })
})
