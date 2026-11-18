import { describe, expect, it } from 'vitest'
import { derivarColores } from '../colores'
import {
  HEX_DE_UN_COLOR_NUEVO,
  MOTIVO_DEL_HEX,
  TOPE_DE_TONOS,
  cambiosDeUnTono,
  normalizarHex,
  validarTono,
  type Tono,
} from './tonos'

const tono = (id: string, nombre: string, hex = HEX_DE_UN_COLOR_NUEVO): Tono => ({
  id,
  clave: nombre.toLowerCase(),
  nombre,
  hex,
  actualizadoEn: '2026-11-08T10:00:00.123456+00:00',
  colores: derivarColores(hex),
})

const nuevo = (nombre: string, hex = HEX_DE_UN_COLOR_NUEVO, tonos: Tono[] = []) =>
  validarTono({ nombre, hex, tonos, original: null })

describe('las reglas de un color', () => {
  it('T1 · el nombre: vacío, de más de 40, repetido (sin importar mayúsculas ni espacios), con los textos de la base', () => {
    expect(nuevo('   ')).toEqual({ ok: false, motivos: { nombre: 'Escribe el nombre del color.' } })
    expect(nuevo('x'.repeat(41))).toEqual({
      ok: false,
      motivos: { nombre: 'El nombre del color admite hasta 40 caracteres.' },
    })
    expect(nuevo('x'.repeat(40)).ok).toBe(true)
    expect(
      nuevo('  verde   AZULADO ', HEX_DE_UN_COLOR_NUEVO, [tono('a', 'Verde azulado')]),
    ).toEqual({
      ok: false,
      motivos: { nombre: 'Ya hay un color «verde AZULADO».' },
    })
  })

  it('T1 · editar no choca con sí mismo ni cuenta contra el tope de 48', () => {
    expect(TOPE_DE_TONOS).toBe(48)
    const lleno = Array.from({ length: 48 }, (_, i) =>
      tono(`id-${String(i)}`, `Color ${String(i)}`),
    )
    const [primero] = lleno
    expect(primero).toBeDefined()
    const editado = validarTono({
      nombre: 'color 0',
      hex: '#000000',
      tonos: lleno,
      original: primero ?? null,
    })
    expect(editado.ok).toBe(true)
    expect(nuevo('Otro', HEX_DE_UN_COLOR_NUEVO, lleno)).toEqual({
      ok: false,
      motivos: { nombre: 'Ya hay 48 colores, que es el máximo. Elimina uno que ningún grupo use.' },
    })
  })

  it('T1 · un hex mal escrito da el motivo de la base junto al campo (tres cifras, sin #, un nombre, una letra de más)', () => {
    for (const hex of ['#fff', 'fff7d6', 'rojo', '#12345g', '']) {
      expect(nuevo('Prueba', hex)).toEqual({ ok: false, motivos: { hex: MOTIVO_DEL_HEX } })
    }
    expect(MOTIVO_DEL_HEX).toBe('Escríbelo como #rrggbb, por ejemplo #31869b.')
    expect(nuevo('', '#fff')).toEqual({
      ok: false,
      motivos: { nombre: 'Escribe el nombre del color.', hex: MOTIVO_DEL_HEX },
    })
  })

  it('T1 · normaliza como la base: recorta los espacios de las puntas y pasa a minúsculas', () => {
    expect(normalizarHex('  #FFF7D6 ')).toBe('#fff7d6')
    expect(normalizarHex('#fff')).toBeNull()
    // `btrim` sólo quita espacios: un tabulador no se recorta, como en la base.
    expect(normalizarHex('\t#fff7d6')).toBeNull()
    expect(nuevo('  Mi   color ', '#31869B')).toEqual({
      ok: true,
      nombre: 'Mi color',
      hex: '#31869b',
    })
  })
})

describe('lo que se guarda de un color', () => {
  const original = tono('a', 'Amarillo', '#fff7d6')
  const validar = (nombre: string, hex: string) => {
    const r = validarTono({ nombre, hex, tonos: [original], original })
    if (!r.ok) throw new Error('debía validar')
    return r
  }

  it('T1 · manda sólo el nombre, sólo el hex o nada', () => {
    expect(cambiosDeUnTono(original, validar('Amarillo', '#FFF7D6'))).toEqual({})
    expect(cambiosDeUnTono(original, validar('Dorado', '#fff7d6'))).toEqual({ nombre: 'Dorado' })
    expect(cambiosDeUnTono(original, validar('Amarillo', '#31869b'))).toEqual({ hex: '#31869b' })
    expect(cambiosDeUnTono(original, validar('Dorado', '#31869b'))).toEqual({
      nombre: 'Dorado',
      hex: '#31869b',
    })
  })
})
