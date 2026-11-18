import { describe, expect, it } from 'vitest'
import {
  alternarVisible,
  aplicarALaHoja,
  AVISO_DE_LA_CABECERA,
  elegirModo,
  mismosValores,
  noAplicar,
  porDefectoDe,
  type PorDefecto,
} from './cabecera-por-defecto'

const modo = (clave: string) => ({ clave, nombre: clave.toUpperCase() })
const MODOS = [modo('a'), modo('b'), modo('c')]
const sin = { modoPorDefecto: null, verTotalBsPorDefecto: false, modosVisibles: null }

describe('porDefectoDe', () => {
  it('sin claves, lo efectivo: el primer modo, falso y todos', () => {
    expect(porDefectoDe({ modos: MODOS, ...sin })).toEqual({
      modo: 'a',
      verTotalBs: false,
      visibles: ['a', 'b', 'c'],
    })
  })

  it('con claves, ésas; los visibles en el orden del diseño y sin los que no son modos', () => {
    expect(
      porDefectoDe({
        modos: MODOS,
        modoPorDefecto: 'c',
        verTotalBsPorDefecto: true,
        modosVisibles: ['c', 'x', 'a'],
      }),
    ).toEqual({ modo: 'c', verTotalBs: true, visibles: ['a', 'c'] })
  })

  it('un modo por defecto que no es del diseño vale el primero; sin modos, nulo', () => {
    expect(porDefectoDe({ modos: MODOS, ...sin, modoPorDefecto: 'x' })?.modo).toBe('a')
    expect(porDefectoDe({ modos: [], ...sin })).toBeNull()
  })
})

describe('elegirModo y alternarVisible', () => {
  const pd: PorDefecto = { modo: 'a', verTotalBs: false, visibles: ['a'] }

  it('el modo elegido queda visible, en el orden del diseño', () => {
    expect(elegirModo(pd, 'c', MODOS)).toEqual({
      modo: 'c',
      verTotalBs: false,
      visibles: ['a', 'c'],
    })
  })

  it('alternar suma o quita un modo; el modo por defecto no se oculta', () => {
    const con = alternarVisible(pd, 'b', MODOS)
    expect(con.visibles).toEqual(['a', 'b'])
    expect(alternarVisible(con, 'b', MODOS).visibles).toEqual(['a'])
    expect(alternarVisible(pd, 'a', MODOS)).toBe(pd)
  })
})

describe('mismosValores', () => {
  it('compara las tres cosas, los visibles en orden', () => {
    const a: PorDefecto = { modo: 'a', verTotalBs: false, visibles: ['a', 'b'] }
    expect(mismosValores(a, { ...a })).toBe(true)
    expect(mismosValores(a, { ...a, modo: 'b' })).toBe(false)
    expect(mismosValores(a, { ...a, verTotalBs: true })).toBe(false)
    expect(mismosValores(a, { ...a, visibles: ['a'] })).toBe(false)
    expect(mismosValores(a, { ...a, visibles: ['b', 'a'] })).toBe(false)
  })
})

describe('aplicarALaHoja', () => {
  it('se puede con el modo en la versión de la hoja', () => {
    expect(
      aplicarALaHoja({ modosDeLaHoja: MODOS, version: 2, soloLectura: false, modo: 'b' }),
    ).toEqual({ puede: true })
  })

  it('no en una de sólo lectura, ni si la versión de la hoja no tiene el modo', () => {
    expect(
      aplicarALaHoja({ modosDeLaHoja: MODOS, version: 2, soloLectura: true, modo: 'b' }),
    ).toEqual({
      puede: false,
      motivo: 'Sólo ves esta cotización: no cambia.',
    })
    expect(
      aplicarALaHoja({ modosDeLaHoja: [modo('a')], version: 3, soloLectura: false, modo: 'b' }),
    ).toEqual({
      puede: false,
      motivo: 'Esta cotización usa la versión 3, que no tiene ese modo.',
    })
  })
})

describe('los textos', () => {
  it('nombran el origen y el modo actual', () => {
    expect(AVISO_DE_LA_CABECERA('Subasta EE. UU.')).toBe(
      'Con esto arrancan las cotizaciones nuevas de Subasta EE. UU.. El selector del encabezado sigue cambiando sólo la cotización abierta.',
    )
    expect(noAplicar('Paralelo')).toBe('Si lo desmarcas, esta cotización se queda en Paralelo.')
  })
})
