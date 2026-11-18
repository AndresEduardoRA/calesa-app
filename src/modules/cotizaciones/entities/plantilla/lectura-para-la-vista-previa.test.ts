import { describe, expect, it } from 'vitest'
import type { CeldaDeLaTarjeta } from '../cuadricula-de-la-tarjeta'
import { convertirPlantilla } from './convertir-plantilla'
import type { Plantilla } from './forma-de-plantilla'
import { lecturaParaLaVistaPrevia } from './lectura-para-la-vista-previa'
import type { TonoDelCatalogo } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

const C = { fondo: '#aaaaaa', borde: '#bbbbbb', tinta: '#111111' }
const tonos: TonoDelCatalogo[] = [
  { clave: 'verde', nombre: 'Verde', hex: '#aaaaaa', claro: C, oscuro: C },
  { clave: 'azul', nombre: 'Azul', hex: '#31869b', claro: C, oscuro: C },
]
const contexto: ContextoDePlantilla = {
  definicion: {
    nodos: [
      {
        id: 'variante',
        tipo: 'opcion',
        etiqueta: 'Variante',
        opciones: [{ clave: 'moto', titulo: 'MOTO' }],
      },
      { id: 'fees', etiqueta: 'Fees', grupo: 'compra', descripcion: 'Comisión' },
      { id: 'grua', etiqueta: 'Grúa', grupo: 'logistica' },
      { id: 'remate', etiqueta: 'Remate', grupo: 'compra' },
      { id: 'tc', etiqueta: 'Oficial' },
      { id: 'tc_u', etiqueta: 'Unificado' },
      { id: 'cif', etiqueta: 'CIF' },
      { id: 'total', etiqueta: 'TOTAL', salida: 'total' },
      { id: 'garantia', etiqueta: 'Garantía', salida: 'aparte' },
    ],
    buckets: { b1: 'tc' },
    grupos: [
      { id: 'compra', etiqueta: 'Compra', tono: 'verde', bucket: 'b1', plazo: '2 días' },
      { id: 'logistica', etiqueta: 'Logística', tono: 'fantasma', plazo: 7 },
    ],
  },
  diseno: {
    cabecera: {
      modos: [
        { clave: 'unificado', nombre: 'Unificado', buckets: [{ bucket: 'b1', nodo: 'tc_u' }] },
      ],
    },
    tarjeta_total: { secundarios: ['garantia'] },
  },
  visibilidad: { variante: { ver: 'todos' } },
  tonos: ['verde', 'azul'],
}
const base: Plantilla = {
  grupos: [{ grupo: 'logistica' }, { grupo: 'compra', tono: 'azul' }],
  total: { etiqueta: 'Total final' },
  logo: true,
  columnas: { leyenda: true, plazo: true, tipo_cambio: true },
}
const leer = (p: Plantilla, c: ContextoDePlantilla = contexto) =>
  lecturaParaLaVistaPrevia({ plantilla: p, contexto: c, tonos })
const ids = (xs: readonly { id: string }[]) => xs.map((x) => x.id).sort()
const celda = (celdas: readonly CeldaDeLaTarjeta[], id: string) => celdas.find((c) => c.id === id)

describe('lecturaParaLaVistaPrevia', () => {
  it('la definición es la conversión de la plantilla con el catálogo; sin grupos de más, filasDeMas es 0', () => {
    const l = leer(base)
    expect(l.lectura.definicion).toEqual(convertirPlantilla(base, contexto, ['verde', 'azul']))
    expect(l.filasDeMas).toBe(0)
  })

  it('sólo lo nombrado: los nodos de las filas y celdas, los grupos de un tc o plazo, el tc de sus buckets y los colores que usan los estilos', () => {
    const { lectura } = leer(base)
    expect(ids(lectura.nodos)).toEqual(['fees', 'garantia', 'grua', 'remate', 'total'])
    expect(lectura.nodos.find((n) => n.id === 'fees')).toEqual({
      id: 'fees',
      etiqueta: 'Fees',
      descripcion: 'Comisión',
      grupo: 'compra',
      pct: null,
    })
    expect(lectura.grupos).toEqual([
      { id: 'compra', etiqueta: 'Compra', plazo: '2 días', bucket: 'b1' },
      // Un plazo que no es texto, nulo.
      { id: 'logistica', etiqueta: 'Logística', plazo: null, bucket: null },
    ])
    // El nombre del tipo de cambio de ejemplo es la etiqueta de su nodo, por omisión y en cada modo.
    expect(lectura.tiposDeCambio).toEqual({
      buckets: [{ bucket: 'b1', nombre: 'Oficial', nodo: 'tc' }],
      modos: [{ modo: 'unificado', bucket: 'b1', nombre: 'Unificado', nodo: 'tc_u' }],
    })
    // «compra» con el azul elegido; «logistica» con un color que no está en el catálogo: sin fondo.
    expect(lectura.colores).toEqual([{ clave: 'azul', hex: '#31869b' }])
    expect(lectura.total).toEqual({ nodo: 'total' })
    expect(lectura.modos).toEqual([])
  })

  it('la variante con sus títulos, sólo si es del nivel «todos» (y la cuadrícula la nombra)', () => {
    expect(leer(base).lectura.variante).toEqual({
      nodo: 'variante',
      opciones: [{ clave: 'moto', titulo: 'MOTO' }],
    })
    const restringida = leer(base, { ...contexto, visibilidad: { variante: { ver: 'costos' } } })
    expect(restringida.lectura.variante).toBeNull()
  })

  it('un color sin hex no viaja', () => {
    const sinHex = lecturaParaLaVistaPrevia({
      plantilla: base,
      contexto,
      tonos: tonos.map(({ hex: _hex, ...resto }) => resto),
    })
    expect(sinHex.lectura.colores).toEqual([])
  })
})

describe('lecturaParaLaVistaPrevia: el tope y los ids raros', () => {
  it('un grupo de 500 miembros se convierte con 4 filas y dice 496 de más', () => {
    const miembros = Array.from({ length: 500 }, (_, i) => ({
      id: `n${i}`,
      etiqueta: `N${i}`,
      grupo: 'compra',
    }))
    const c: ContextoDePlantilla = {
      ...contexto,
      definicion: {
        ...contexto.definicion,
        nodos: [...miembros, { id: 'total', etiqueta: 'TOTAL', salida: 'total' }],
      },
    }
    const l = leer({ ...base, grupos: [{ grupo: 'compra' }, { grupo: 'logistica' }] }, c)
    const filas = l.lectura.definicion.filas.filter(
      (f) => f.nodo !== undefined && f.nodo.startsWith('n'),
    )
    expect(filas.map((f) => f.nodo)).toEqual(['n0', 'n1', 'n2', 'n3'])
    expect(l.filasDeMas).toBe(496)
  })

  it('los ids `constructor` y `__proto__` no rompen', () => {
    const c: ContextoDePlantilla = {
      ...contexto,
      definicion: {
        nodos: [
          { id: 'constructor', etiqueta: 'C', grupo: 'g' },
          { id: '__proto__', etiqueta: 'P', grupo: 'g' },
          { id: 'total', etiqueta: 'TOTAL', salida: 'total' },
        ],
        grupos: [{ id: 'g', etiqueta: 'G', bucket: 'constructor' }],
        buckets: {},
      },
    }
    const p: Plantilla = {
      ...base,
      grupos: [{ grupo: 'g' }],
      etiquetas: JSON.parse('{"__proto__":"Uno"}'),
    }
    const { lectura } = leer(p, c)
    expect(celda(lectura.definicion.celdas, 'c_n___proto___concepto')?.contenido).toEqual({
      tipo: 'texto',
      texto: 'Uno',
    })
    expect(lectura.tiposDeCambio.buckets).toEqual([
      { bucket: 'constructor', nombre: null, nodo: null },
    ])
  })
})
