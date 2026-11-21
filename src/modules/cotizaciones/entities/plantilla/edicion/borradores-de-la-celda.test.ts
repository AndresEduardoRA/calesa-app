import { describe, expect, it } from 'vitest'
import type { ContenidoDeLaCelda } from '../../cuadricula-de-la-tarjeta'
import {
  borradorDeCondiciones,
  borradorDeRespaldo,
  cambiarEn,
  completarCondiciones,
  completarRespaldo,
  completarSi,
  moverEn,
  motivoParaQuitarCondicion,
  motivoParaQuitarDato,
  motivoParaQuitarRama,
  motivoParaSumarCondicion,
  motivoParaSumarDato,
  motivoParaSumarRama,
  quitarCondicion,
  quitarDato,
  quitarRama,
  sumarCondicion,
  sumarDato,
  sumarRama,
} from './borradores-de-la-celda'
import {
  CONDICION_VACIA,
  MINIMOS_DE_LAS_CONDICIONES,
  MOTIVOS_DE_LAS_CONDICIONES,
  TOPES_DE_LAS_CONDICIONES,
} from './condiciones'

const L = 'es-BO'
const TITULO = { tipo: 'dato', variable: 'titulo' } as const
const VEHICULO = { tipo: 'dato', variable: 'vehiculo_titulo' } as const
const REMATE = { tipo: 'dato', nodo: 'remate', mostrar: 'monto' } as const
const CONDICIONES: ContenidoDeLaCelda = {
  tipo: 'condiciones',
  ramas: [
    { si: [{ es: 'mayor', nodo: 'remate', a: 1000 }], contenido: REMATE },
    { si: [{ es: 'encendido', nodo: 'seguro' }], contenido: { tipo: 'texto', texto: '' } },
  ],
  si_no: { tipo: 'texto', texto: 'A consultar' },
}

describe('las listas', () => {
  it('mover, quitar y cambiar; fuera de rango, igual', () => {
    expect(moverEn(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moverEn(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    const xs = ['a', 'b']
    expect(moverEn(xs, 1, 1)).toBe(xs)
    expect(cambiarEn(xs, 1, 'z')).toEqual(['a', 'z'])
  })
})

describe('la lista de respaldo', () => {
  it('desde un dato: el dato y un hueco, que no se completa hasta elegirlo', () => {
    const b = borradorDeRespaldo(TITULO)
    expect(b.datos).toEqual([TITULO, null])
    expect(completarRespaldo(b)).toEqual({
      ok: false,
      motivos: new Map([['datos.1', MOTIVOS_DE_LAS_CONDICIONES.dato]]),
    })
    expect(completarRespaldo({ datos: [TITULO, VEHICULO] })).toEqual({
      ok: true,
      valor: { tipo: 'respaldo', datos: [TITULO, VEHICULO] },
    })
  })
  it('con uno solo, «Elige al menos dos datos.»; hasta 5', () => {
    const uno = completarRespaldo({ datos: [TITULO] })
    expect(!uno.ok && uno.motivos.get('datos')).toBe(MOTIVOS_DE_LAS_CONDICIONES.dosDatos)
    const cinco = { datos: [TITULO, VEHICULO, REMATE, TITULO, VEHICULO] }
    expect(motivoParaSumarDato(cinco)).toBe(TOPES_DE_LAS_CONDICIONES.datos)
    expect(sumarDato(cinco)).toBe(cinco)
    expect(sumarDato({ datos: [TITULO] }).datos).toEqual([TITULO, null])
  })
  it('quitar deja al menos dos', () => {
    const dos = { datos: [TITULO, VEHICULO] }
    expect(motivoParaQuitarDato(dos)).toBe(MINIMOS_DE_LAS_CONDICIONES.datos)
    expect(quitarDato(dos, 0)).toBe(dos)
    expect(quitarDato({ datos: [TITULO, null, VEHICULO] }, 1).datos).toEqual([TITULO, VEHICULO])
  })
  it('desde una lista, la suya; desde condiciones, su primer dato', () => {
    expect(borradorDeRespaldo({ tipo: 'respaldo', datos: [VEHICULO, TITULO] }).datos).toEqual([
      VEHICULO,
      TITULO,
    ])
    expect(borradorDeRespaldo(CONDICIONES).datos).toEqual([REMATE, null])
    expect(borradorDeRespaldo(null).datos).toEqual([null, null])
  })
})

describe('las condiciones de una celda', () => {
  it('ida y vuelta: las ramas, sus condiciones, su contenido y el «si no»', () => {
    const b = borradorDeCondiciones(CONDICIONES, L)
    expect(b.ramas[0]?.si[0]?.numero).toBe('1000')
    expect(completarCondiciones(b, L)).toEqual({ ok: true, valor: CONDICIONES })
  })
  it('desde un dato: una rama sin condición que lo muestra y «si no», nada', () => {
    const b = borradorDeCondiciones(REMATE, L)
    expect(b).toEqual({
      ramas: [{ si: [CONDICION_VACIA], contenido: { tipo: 'dato', dato: REMATE } }],
      si_no: { tipo: 'vacio' },
    })
    const r = completarCondiciones(b, L)
    expect(!r.ok && Object.fromEntries(r.motivos)).toEqual({
      'ramas.0.si.0.sobre': MOTIVOS_DE_LAS_CONDICIONES.dato,
    })
    expect(borradorDeCondiciones({ tipo: 'texto', texto: 'x' }, L).ramas[0]?.contenido).toEqual({
      tipo: 'texto',
      texto: '',
    })
  })
  it('cada contenido incompleto o inválido con su motivo; un texto vacío vale', () => {
    const b = borradorDeCondiciones(CONDICIONES, L)
    const malo = {
      ramas: cambiarEn(b.ramas, 0, {
        si: b.ramas[0]?.si ?? [],
        contenido: { tipo: 'dato', dato: null },
      } as const),
      si_no: { tipo: 'texto', texto: 'a {{ b' },
    } as const
    const r = completarCondiciones(malo, L)
    expect(!r.ok && Object.fromEntries(r.motivos)).toEqual({
      'ramas.0.contenido': MOTIVOS_DE_LAS_CONDICIONES.dato,
      si_no: 'Un texto no lleva «{{».',
    })
  })
  it('hasta 4 ramas con el «si no» y 3 condiciones por rama; siempre queda una', () => {
    let b = borradorDeCondiciones(CONDICIONES, L)
    b = sumarRama(sumarRama(b))
    expect(b.ramas).toHaveLength(4)
    expect(motivoParaSumarRama(b)).toBe(TOPES_DE_LAS_CONDICIONES.ramas)
    expect(sumarRama(b)).toBe(b)
    const una = { ...b, ramas: b.ramas.slice(0, 1) }
    expect(motivoParaQuitarRama(una)).toBe(MINIMOS_DE_LAS_CONDICIONES.ramas)
    expect(quitarRama(una, 0)).toBe(una)
    expect(quitarRama(b, 1).ramas).toHaveLength(3)
    const tres = sumarCondicion(sumarCondicion([CONDICION_VACIA]))
    expect(tres).toHaveLength(3)
    expect(motivoParaSumarCondicion(tres)).toBe(TOPES_DE_LAS_CONDICIONES.condiciones)
    expect(sumarCondicion(tres)).toBe(tres)
    const sola = [CONDICION_VACIA]
    expect(motivoParaQuitarCondicion(sola)).toBe(MINIMOS_DE_LAS_CONDICIONES.condiciones)
    expect(quitarCondicion(sola, 0)).toBe(sola)
    expect(quitarCondicion(tres, 2)).toHaveLength(2)
  })
})

describe('las condiciones de una fila', () => {
  it('enteras, o los motivos en «si.<m>»', () => {
    expect(completarSi([{ sobre: REMATE, es: 'igual', numero: '2,5', opcion: null }], L)).toEqual({
      ok: true,
      valor: [{ es: 'igual', nodo: 'remate', a: 2.5 }],
    })
    const r = completarSi([{ ...CONDICION_VACIA, sobre: REMATE, es: 'mayor' }], L)
    expect(!r.ok && Object.fromEntries(r.motivos)).toEqual({
      'si.0.numero': MOTIVOS_DE_LAS_CONDICIONES.numero,
    })
  })
})
