import { describe, expect, it } from 'vitest'
import { celda, grilla, rect, texto } from './edicion.soporte'
import { mapaDeLaGrilla } from './mapa-de-la-grilla'
import {
  ajustarSeleccion,
  casillaActiva,
  esUnaSolaCelda,
  extenderHasta,
  mismaSeleccion,
  moverFoco,
  rangoDe,
  seleccionarCelda,
  seleccionarColumnas,
  seleccionarFilas,
} from './seleccion'

// 5 × 4: `a` combina (1,1)-(2,2).
const P = grilla(5, 4, [{ ...celda('a', 1, 1, texto('A')), abarca_filas: 2, abarca_columnas: 2 }])
const mapa = mapaDeLaGrilla(P)
const TODAS = [0, 1, 2, 3, 4]
const grillaVisible = (visibles = TODAS) => ({ mapa, p: P, visibles })

describe('rangoDe', () => {
  it('un rango que corta una combinación crece hasta contenerla', () => {
    const sel = { tipo: 'celdas' as const, ancla: { f: 0, k: 0 }, foco: { f: 1, k: 1 } }
    expect(rangoDe(sel, mapa, P)).toEqual(rect(0, 0, 2, 2))
  })
  it('filas y columnas enteras', () => {
    expect(rangoDe(seleccionarFilas(3, 1), mapa, P)).toEqual(rect(1, 0, 3, 3))
    expect(rangoDe(seleccionarColumnas(2), mapa, P)).toEqual(rect(0, 2, 4, 2))
  })
})

describe('seleccionar', () => {
  it('una casilla cubierta elige la celda desde su ancla', () => {
    expect(seleccionarCelda(mapa, P, { f: 2, k: 2 })).toEqual({
      tipo: 'celdas',
      ancla: { f: 1, k: 1 },
      foco: { f: 1, k: 1 },
    })
  })
  it('Shift+clic deja el ancla y mueve el foco', () => {
    const sel = seleccionarCelda(mapa, P, { f: 0, k: 0 })
    expect(extenderHasta(sel, { f: 3, k: 3 })).toEqual({
      tipo: 'celdas',
      ancla: { f: 0, k: 0 },
      foco: { f: 3, k: 3 },
    })
    expect(extenderHasta(null, { f: 1, k: 0 })).toEqual({
      tipo: 'celdas',
      ancla: { f: 1, k: 0 },
      foco: { f: 1, k: 0 },
    })
  })
  it('una sola celda: la combinada lo es; dos casillas, no', () => {
    expect(esUnaSolaCelda(seleccionarCelda(mapa, P, { f: 1, k: 1 }), mapa, P)).toBe(true)
    expect(
      esUnaSolaCelda(
        extenderHasta(seleccionarCelda(mapa, P, { f: 0, k: 0 }), { f: 0, k: 1 }),
        mapa,
        P,
      ),
    ).toBe(false)
    expect(esUnaSolaCelda(seleccionarFilas(0), mapa, P)).toBe(false)
  })
  it('la casilla activa', () => {
    expect(casillaActiva(null, [2, 3])).toEqual({ f: 2, k: 0 })
    expect(casillaActiva(seleccionarFilas(3, 1), TODAS)).toEqual({ f: 1, k: 0 })
    expect(casillaActiva(seleccionarColumnas(2), [1, 2])).toEqual({ f: 1, k: 2 })
  })
})

describe('moverFoco', () => {
  const en = (f: number, k: number) => seleccionarCelda(mapa, P, { f, k })

  it('de costado salta lo que cubre la combinación', () => {
    expect(moverFoco(en(1, 0), 'derecha', false, grillaVisible())).toEqual(en(1, 1))
    expect(moverFoco(en(1, 1), 'derecha', false, grillaVisible())).toEqual(en(1, 3))
    expect(moverFoco(en(1, 3), 'izquierda', false, grillaVisible())).toEqual(en(1, 1))
  })
  it('hacia abajo salta la combinación y las filas ocultas', () => {
    expect(moverFoco(en(1, 1), 'abajo', false, grillaVisible())).toEqual(en(3, 1))
    expect(moverFoco(en(0, 0), 'abajo', false, grillaVisible([0, 3, 4]))).toEqual(en(3, 0))
    expect(moverFoco(en(3, 0), 'arriba', false, grillaVisible([0, 3, 4]))).toEqual(en(0, 0))
  })
  it('en el borde se queda', () => {
    expect(moverFoco(en(0, 0), 'arriba', false, grillaVisible())).toEqual(en(0, 0))
    expect(moverFoco(en(0, 3), 'derecha', false, grillaVisible())).toEqual(en(0, 3))
    expect(moverFoco(en(4, 0), 'abajo', false, grillaVisible())).toEqual(en(4, 0))
  })
  it('Home, End, Ctrl+Home y Ctrl+End', () => {
    expect(moverFoco(en(3, 2), 'inicio', false, grillaVisible())).toEqual(en(3, 0))
    expect(moverFoco(en(3, 0), 'fin', false, grillaVisible())).toEqual(en(3, 3))
    expect(moverFoco(en(3, 2), 'primera', false, grillaVisible([1, 2, 3]))).toEqual(en(1, 0))
    expect(moverFoco(en(1, 0), 'ultima', false, grillaVisible([1, 2, 3]))).toEqual(en(3, 3))
  })
  it('con Shift el ancla se queda y el rango crece', () => {
    const sel = moverFoco(
      moverFoco(en(0, 0), 'derecha', true, grillaVisible()),
      'derecha',
      true,
      grillaVisible(),
    )
    expect(sel).toEqual({ tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 0, k: 2 } })
    expect(rangoDe(sel, mapa, P)).toEqual(rect(0, 0, 0, 2))
    // Desde filas elegidas, Shift arranca un rango en la casilla activa.
    expect(moverFoco(seleccionarFilas(3), 'derecha', true, grillaVisible())).toEqual({
      tipo: 'celdas',
      ancla: { f: 3, k: 0 },
      foco: { f: 3, k: 1 },
    })
  })
  it('sin selección elige la primera casilla visible', () => {
    expect(moverFoco(null, 'abajo', false, grillaVisible([2, 3]))).toEqual(en(2, 0))
  })
})

describe('ajustarSeleccion', () => {
  it('recorta lo que quedó fuera de una grilla más chica', () => {
    const chica = mapaDeLaGrilla(grilla(2, 2))
    expect(ajustarSeleccion(seleccionarFilas(4), chica)).toEqual(seleccionarFilas(1))
    expect(ajustarSeleccion(seleccionarColumnas(0, 3), chica)).toEqual(seleccionarColumnas(0, 1))
    expect(
      ajustarSeleccion({ tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 9, k: 9 } }, chica),
    ).toEqual({ tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 1, k: 1 } })
    expect(ajustarSeleccion(null, chica)).toBeNull()
  })
  it('compara dos selecciones por lo que eligen', () => {
    expect(mismaSeleccion(seleccionarFilas(1), seleccionarFilas(1, 1))).toBe(true)
    expect(mismaSeleccion(seleccionarFilas(1), null)).toBe(false)
  })
})
