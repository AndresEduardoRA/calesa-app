import { describe, expect, it } from 'vitest'
import type { AccesoDeCotizacion } from './acceso'
import { consultaDe, destinoDeLaUrlVieja } from './url-vieja'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const AJENO = '99999999-9999-4999-8999-999999999999'
const BASE = '/configuracion/cotizacion'

const todo: AccesoDeCotizacion = { origenes: [A, B], configura: true, veNiveles: true }
const configura: AccesoDeCotizacion = { origenes: [A, B], configura: true, veNiveles: false }
const soloRoles: AccesoDeCotizacion = { origenes: [], configura: false, veNiveles: true }

const destino = (consulta: string, acceso = todo) =>
  destinoDeLaUrlVieja(new URLSearchParams(consulta), acceso)

describe('destinoDeLaUrlVieja', () => {
  it('sin parámetros, el inicio', () => {
    expect(destino('')).toBeNull()
  })

  it('cada pestaña de antes va a su sub-ruta, del origen pedido', () => {
    expect(destino(`seccion=formula&origen=${B}`)).toBe(`${BASE}/${B}/formula`)
    expect(destino(`seccion=diseno&origen=${B}`)).toBe(`${BASE}/${B}/hoja`)
    expect(destino(`seccion=tarjeta&origen=${B}`)).toBe(`${BASE}/${B}/tarjeta`)
    expect(destino(`seccion=tablas&origen=${B}`)).toBe(`${BASE}/${B}/tablas`)
    expect(destino('seccion=tonos')).toBe(`${BASE}/general/colores`)
    expect(destino('seccion=colores')).toBe(`${BASE}/general/colores`)
    expect(destino('seccion=niveles')).toBe(`${BASE}/general/niveles`)
    expect(destino('seccion=ajustes')).toBe(`${BASE}/general/vigencia`)
  })

  it('sin origen, o con uno ajeno, el primero que configura', () => {
    expect(destino('seccion=formula')).toBe(`${BASE}/${A}/formula`)
    expect(destino(`seccion=diseno&origen=${AJENO}`)).toBe(`${BASE}/${A}/hoja`)
    expect(destino('seccion=tablas&origen=general')).toBe(`${BASE}/${A}/tablas`)
  })

  it('conserva los paneles y los demás parámetros, en su orden y con su primer valor', () => {
    expect(destino(`seccion=formula&origen=${B}&panel=publicar-formula`)).toBe(
      `${BASE}/${B}/formula?panel=publicar-formula`,
    )
    expect(destino(`seccion=formula&panel=revertir-formula&origen=${A}&version=v1`)).toBe(
      `${BASE}/${A}/formula?panel=revertir-formula&version=v1`,
    )
    expect(destino(`seccion=tablas&origen=${B}&tabla=t1&panel=publicar-tabla`)).toBe(
      `${BASE}/${B}/tablas?tabla=t1&panel=publicar-tabla`,
    )
    expect(destino('seccion=tonos&panel=editar-tono&tono=azul')).toBe(
      `${BASE}/general/colores?panel=editar-tono&tono=azul`,
    )
    expect(destino('seccion=niveles&panel=renombrar-nivel&nivel=n1&nivel=n2')).toBe(
      `${BASE}/general/niveles?panel=renombrar-nivel&nivel=n1`,
    )
    expect(destino(`seccion=diseno&origen=${A}&vista=412`)).toBe(`${BASE}/${A}/hoja?vista=412`)
  })

  it('sin seccion, o con una desconocida, la primera de antes que abre, con lo demás', () => {
    expect(destino('panel=nuevo-nivel')).toBe(`${BASE}/general/niveles?panel=nuevo-nivel`)
    expect(destino(`origen=${B}`, configura)).toBe(`${BASE}/${B}/formula`)
    expect(destino('seccion=otra', configura)).toBe(`${BASE}/${A}/formula`)
    expect(destino('seccion=<script>&panel=x')).toBe(`${BASE}/general/niveles?panel=x`)
  })

  it('una que no abre lleva a la primera que sí, sin parámetros', () => {
    expect(destino('seccion=niveles&panel=nuevo-nivel', configura)).toBe(`${BASE}/${A}/formula`)
    expect(destino(`seccion=formula&origen=${A}&panel=publicar-formula`, soloRoles)).toBe(
      `${BASE}/general/niveles`,
    )
  })

  it('quien configura sin orígenes va a Colores', () => {
    const sinOrigenes = { origenes: [], configura: true, veNiveles: false }
    expect(destino('seccion=formula', sinOrigenes)).toBe(`${BASE}/general/colores`)
  })

  it('sin nada que abrir, null', () => {
    expect(
      destino('seccion=formula', { origenes: [], configura: false, veNiveles: false }),
    ).toBeNull()
  })

  it('nunca devuelve seccion ni origen en el destino', () => {
    const casos = [
      'seccion=formula&seccion=tarjeta',
      `seccion=tarjeta&origen=${A}&origen=${B}`,
      'seccion=ajustes&origen=x',
      'seccion=niveles&seccion=niveles',
      'origen=x&otra=1',
    ]
    for (const acceso of [todo, configura, soloRoles]) {
      for (const caso of casos) {
        const ruta = destino(caso, acceso) ?? ''
        expect(ruta, caso).not.toMatch(/[?&](seccion|origen)=/)
      }
    }
  })
})

describe('consultaDe', () => {
  it('el primer valor de cada parámetro, en su orden', () => {
    expect(consultaDe({ panel: ['a', 'b'], tabla: 't', vacio: undefined })).toEqual({
      panel: 'a',
      tabla: 't',
    })
  })
})
