import { describe, expect, it } from 'vitest'
import { COLOR_TINTA } from '@/shared/config/app'
import { CONTRASTE_AA, contraste, luminancia } from '@/shared/lib/color'
import {
  LUMINANCIA_DEL_FONDO_CLARO,
  LUMINANCIA_DEL_FONDO_OSCURO,
  coloresDeLaTarjeta,
  contrasteDeLaTarjeta,
  derivarColores,
  razonEnTexto,
  tintaDeLaTarjeta,
} from './colores'

const EXTREMOS = [
  '#000000',
  '#ffffff',
  '#ffff00',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#767676',
  '#777777',
  '#808080',
  '#31869b',
  '#1b2130',
]

describe('derivarColores', () => {
  it.each(EXTREMOS)('%s cumple AA en claro y en oscuro, con el borde = el hex', (hex) => {
    const { claro, oscuro } = derivarColores(hex)
    expect(contraste(claro.tinta, claro.fondo)).toBeGreaterThanOrEqual(CONTRASTE_AA)
    expect(contraste(oscuro.tinta, oscuro.fondo)).toBeGreaterThanOrEqual(CONTRASTE_AA)
    expect(luminancia(claro.fondo)).toBeGreaterThanOrEqual(LUMINANCIA_DEL_FONDO_CLARO)
    expect(luminancia(oscuro.fondo)).toBeLessThanOrEqual(LUMINANCIA_DEL_FONDO_OSCURO)
    expect(claro.borde).toBe(hex)
    expect(oscuro.borde).toBe(hex)
  })

  it('da hex en minúsculas y siempre lo mismo para el mismo color', () => {
    const una = derivarColores('#31869B')
    expect(una).toEqual(derivarColores('#31869b'))
    const todos = [una.claro, una.oscuro].flatMap((t) => [t.fondo, t.borde, t.tinta])
    for (const color of todos) expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('un hex que ya es claro queda de fondo claro tal cual (los de fábrica no cambian de fondo)', () => {
    expect(derivarColores('#fff7d6').claro.fondo).toBe('#fff7d6')
    expect(derivarColores('#ffffff').claro.fondo).toBe('#ffffff')
  })

  it('el teal de ejemplo se aclara en claro y se oscurece en oscuro', () => {
    expect(derivarColores('#31869b')).toEqual({
      claro: { fondo: '#deecef', borde: '#31869b', tinta: '#297182' },
      oscuro: { fondo: '#234352', borde: '#31869b', tinta: '#7fb4c1' },
    })
  })
})

describe('tintaDeLaTarjeta', () => {
  it('un color migrado (hex = su fondo claro) conserva su tinta clara', () => {
    expect(tintaDeLaTarjeta('#fff7d6', '#1b2130')).toBe('#1b2130')
  })

  it('si la tinta clara no se lee sobre el hex, el que más contraste dé entre negro y blanco', () => {
    const teal = derivarColores('#31869b')
    expect(tintaDeLaTarjeta('#31869b', teal.claro.tinta)).toBe('#ffffff')
    // El rojo puro da 4,0 con la tinta oscura y 3,9 con blanco: gana la tinta.
    expect(tintaDeLaTarjeta('#ff0000', derivarColores('#ff0000').claro.tinta)).toBe(COLOR_TINTA)
    expect(tintaDeLaTarjeta('#000000', '#000000')).toBe('#ffffff')
  })

  it('coloresDeLaTarjeta pinta el hex tal cual, con el borde claro y el texto que se lee', () => {
    expect(
      coloresDeLaTarjeta({ hex: '#31869B', claro: { borde: '#31869b', tinta: '#297182' } }),
    ).toEqual({ fondo: '#31869b', borde: '#31869b', tinta: '#ffffff' })
  })
})

describe('contrasteDeLaTarjeta', () => {
  it.each([
    ['#31869b', true, '3,8', '4,1'],
    ['#ff0000', true, '4,0', '3,9'],
    ['#fff2cc', false, '14,4', '1,1'],
    ['#1b2130', false, '1,0', '16,0'],
  ])('%s: aviso %s, con negro %s y con blanco %s', (hex, aviso, negro, blanco) => {
    const medido = contrasteDeLaTarjeta(hex)
    expect(medido.aviso).toBe(aviso)
    expect(medido.textoNegro).toBe(negro)
    expect(medido.textoBlanco).toBe(blanco)
  })

  it('la razón se trunca a un decimal, con coma', () => {
    expect(razonEnTexto(3.249)).toBe('3,2')
    expect(razonEnTexto(4.5)).toBe('4,5')
    expect(razonEnTexto(21)).toBe('21,0')
  })
})
