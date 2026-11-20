import { describe, expect, it } from 'vitest'
import {
  CON_BORRADOR,
  estadoDeLaFormula,
  formulaDeLaLista,
  ordenDeLaLista,
  tieneTarjeta,
  tieneVersion,
  type FilaLeidaDeLaLista,
} from './lista'

const ID = '11111111-1111-4111-8111-111111111111'
const P1 = '22222222-2222-4222-8222-222222222222'
const B1 = '33333333-3333-4333-8333-333333333333'
const HORA = '2026-11-20 10:00:00.123456+00'

const fila = (cambios: Partial<FilaLeidaDeLaLista> = {}): FilaLeidaDeLaLista => ({
  id: ID,
  nombre: 'Planilla',
  activa: false,
  activada_en: null,
  archivada_en: null,
  copiada_de_otro_origen: false,
  actualizado_en: HORA,
  formulas: [],
  plantillas_tarjeta: [],
  ...cambios,
})

describe('formulaDeLaLista', () => {
  it('toma el borrador con su hora y la publicada con su versión; la archivada no cuenta', () => {
    const f = formulaDeLaLista(
      fila({
        formulas: [
          { id: P1, estado: 'publicada', version: 3, actualizado_en: HORA },
          { id: B1, estado: 'borrador', version: null, actualizado_en: HORA },
          { id: ID, estado: 'archivada', version: 2, actualizado_en: HORA },
        ],
      }),
    )
    expect(f.formula).toEqual({
      borrador: { id: B1, actualizadoEn: HORA },
      publicada: { id: P1, version: 3 },
    })
    expect(f.tarjeta).toEqual({ borrador: null, publicada: null })
    expect(f.actualizadoEn).toBe(HORA)
  })
})

describe('ordenDeLaLista', () => {
  it('la activa primero y las demás por nombre, sin mayúsculas ni tildes y con los números en orden', () => {
    const orden = ordenDeLaLista([
      { id: '1', nombre: 'Fórmula 10', activa: false },
      { id: '2', nombre: 'zeta', activa: false },
      { id: '3', nombre: 'Fórmula 2', activa: false },
      { id: '4', nombre: 'Árbol', activa: false },
      { id: '5', nombre: 'Última', activa: true },
    ]).map((f) => f.nombre)
    expect(orden).toEqual(['Última', 'Árbol', 'Fórmula 2', 'Fórmula 10', 'zeta'])
  })
})

describe('estadoDeLaFormula', () => {
  const con = (publicada: number | null, borrador: boolean) => ({
    publicada: publicada === null ? null : { id: P1, version: publicada },
    borrador: borrador ? { id: B1, actualizadoEn: HORA } : null,
  })
  it('activa, publicada no activa, borrador y archivada', () => {
    expect(estadoDeLaFormula({ activa: true, archivadaEn: null, formula: con(3, false) })).toEqual({
      etiqueta: 'Activa · v3',
      tono: 'activa',
      detalle: null,
    })
    expect(estadoDeLaFormula({ activa: false, archivadaEn: null, formula: con(1, true) })).toEqual({
      etiqueta: 'v1 publicada, no activa',
      tono: 'publicada',
      detalle: CON_BORRADOR,
    })
    expect(
      estadoDeLaFormula({ activa: false, archivadaEn: null, formula: con(null, true) }),
    ).toEqual({ etiqueta: 'Borrador', tono: 'borrador', detalle: null })
    expect(
      estadoDeLaFormula({ activa: false, archivadaEn: HORA, formula: con(2, true) }).etiqueta,
    ).toBe('Archivada')
  })
})

describe('tieneTarjeta y tieneVersion', () => {
  it('basta el borrador o la publicada', () => {
    const vacia = formulaDeLaLista(fila())
    expect([tieneTarjeta(vacia), tieneVersion(vacia)]).toEqual([false, false])
    const conBorradores = formulaDeLaLista(
      fila({
        formulas: [{ id: B1, estado: 'borrador', version: null, actualizado_en: HORA }],
        plantillas_tarjeta: [{ id: P1, estado: 'borrador', version: null, actualizado_en: HORA }],
      }),
    )
    expect([tieneTarjeta(conBorradores), tieneVersion(conBorradores)]).toEqual([true, true])
  })
})
