import { describe, expect, it } from 'vitest'
import type { FaseDelItem, FilaDeItem } from '../nucleo/item'
import { CLAVE_SIN_FASE, agruparPorPaso, textoDelGrupo } from './grupos-por-paso'

const fase = (id: string, nombre: string): FaseDelItem => ({
  id,
  nombre,
  color: '#000',
  esFinal: false,
})
const COMPRAR = fase('f-comprar', 'Comprar')
const TRANSITO = fase('f-transito', 'En tránsito')
const RECIBIDO = fase('f-recibido', 'Recibido')
const ORDEN = new Map([
  [COMPRAR.id, 0],
  [TRANSITO.id, 1],
  [RECIBIDO.id, 2],
])

const fila = (id: string, f: FaseDelItem | null): FilaDeItem => ({
  id,
  proyectoId: 'p',
  descripcion: id,
  tipoPiezaId: null,
  condicionId: null,
  paisOrigenId: null,
  modoTransporteId: null,
  cantidad: 1,
  stockCantidad: 0,
  precioCliente: null,
  moneda: null,
  tracking: null,
  notas: null,
  fase: f,
  enStock: false,
  actualizadoEn: '2026-11-18T10:00:00Z',
})

const resumen = (grupos: ReturnType<typeof agruparPorPaso>) =>
  grupos.map((g) => [g.clave, g.filas.map((f) => f.id)])

describe('agruparPorPaso', () => {
  it('ordena los grupos por el lugar de su fase, «Sin fase» al final, y conserva el orden de las filas', () => {
    const grupos = agruparPorPaso(
      [
        fila('a', RECIBIDO),
        fila('b', null),
        fila('c', COMPRAR),
        fila('d', RECIBIDO),
        fila('e', COMPRAR),
      ],
      ORDEN,
      false,
    )
    expect(resumen(grupos)).toEqual([
      [COMPRAR.id, ['c', 'e']],
      [RECIBIDO.id, ['a', 'd']],
      [CLAVE_SIN_FASE, ['b']],
    ])
  })

  it('un paso sin ítems no sale', () => {
    const grupos = agruparPorPaso([fila('a', COMPRAR)], ORDEN, false)
    expect(grupos.map((g) => g.clave)).toEqual([COMPRAR.id])
  })

  it('una fase fuera del orden va tras las conocidas, por nombre, y antes de «Sin fase»', () => {
    const zeta = fase('f-z', 'Zeta')
    const alfa = fase('f-a', 'Alfa')
    const grupos = agruparPorPaso(
      [fila('a', zeta), fila('b', null), fila('c', alfa), fila('d', TRANSITO)],
      ORDEN,
      false,
    )
    expect(grupos.map((g) => g.clave)).toEqual([TRANSITO.id, alfa.id, zeta.id, CLAVE_SIN_FASE])
  })

  it('sin orden (flujo sin fases o ilegible), un solo grupo «Sin fase» con todos', () => {
    const grupos = agruparPorPaso(
      [fila('a', COMPRAR), fila('b', null), fila('c', RECIBIDO)],
      null,
      false,
    )
    expect(resumen(grupos)).toEqual([[CLAVE_SIN_FASE, ['a', 'b', 'c']]])
    expect(grupos[0]?.texto).toBe('Sin fase · 3')
    expect(grupos[0]?.fase).toBeNull()
  })

  it('sin filas, ningún grupo', () => {
    expect(agruparPorPaso([], ORDEN, false)).toEqual([])
  })

  it('el encabezado dice el nombre y cuántos; con la hoja topada, «N+»', () => {
    const filas = [fila('a', COMPRAR), fila('b', COMPRAR), fila('c', null)]
    expect(agruparPorPaso(filas, ORDEN, false).map((g) => g.texto)).toEqual([
      'Comprar · 2',
      'Sin fase · 1',
    ])
    expect(agruparPorPaso(filas, ORDEN, true).map((g) => g.texto)).toEqual([
      'Comprar · 2+',
      'Sin fase · 1+',
    ])
  })
})

describe('textoDelGrupo', () => {
  it('«Comprar · 3» y «Comprar · 37+»', () => {
    expect(textoDelGrupo('Comprar', 3, false)).toBe('Comprar · 3')
    expect(textoDelGrupo('Comprar', 37, true)).toBe('Comprar · 37+')
  })
})
