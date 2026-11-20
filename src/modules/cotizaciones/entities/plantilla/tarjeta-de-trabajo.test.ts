import { describe, expect, it } from 'vitest'
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import type { PlantillaDelOrigen, VersionDePlantilla } from './lectura-de-la-plantilla'
import { lecturaDeLaTarjetaDeTrabajo } from './tarjeta-de-trabajo'

const cuadricula = (nodos: readonly string[], conPorcentaje = false): PlantillaEnCuadricula => ({
  forma: 2,
  columnas: [
    { id: 'a', ancho: 200 },
    { id: 'b', ancho: 100 },
  ],
  filas: nodos.map((n) => ({ id: `f_${n}`, alto: 20, ocultar_si: 'nunca' as const, nodo: n })),
  celdas: nodos.flatMap((n) => [
    {
      id: `e_${n}`,
      fila: `f_${n}`,
      columna: 'a',
      contenido: { tipo: 'dato' as const, nodo: n, mostrar: 'etiqueta' as const },
    },
    {
      id: `m_${n}`,
      fila: `f_${n}`,
      columna: 'b',
      contenido: {
        tipo: 'dato' as const,
        nodo: n,
        mostrar: conPorcentaje ? ('porcentaje' as const) : ('monto' as const),
      },
    },
  ]),
})

const HORA = '2026-11-07T15:00:00.123456+00:00'
const version = (
  c: PlantillaEnCuadricula,
  extra: Partial<VersionDePlantilla> = {},
): VersionDePlantilla => ({
  id: 'x',
  version: null,
  nota: null,
  actualizadoEn: HORA,
  publicadoEn: null,
  contenido: { forma: 2, cuadricula: c },
  ...extra,
})

const lectura = (extra: Partial<PlantillaDelOrigen> = {}): PlantillaDelOrigen => ({
  formulaDelOrigenId: '44444444-4444-4444-8444-444444444444',
  publicada: null,
  borrador: null,
  formula: { id: 'f', version: 1 },
  contexto: {
    definicion: {
      nodos: [
        { id: 'fees', grupo: 'compra', etiqueta: 'Fees' },
        { id: 'tasa', etiqueta: 'Tasa' },
        {
          id: 'comision',
          grupo: 'compra',
          etiqueta: 'Comisión',
          tipo: 'calculo',
          op: 'porcentaje_de',
          pct: 'tasa',
        },
        { id: 'cif', etiqueta: 'CIF', salida: 'base_imponible' },
      ],
      grupos: [{ id: 'compra', etiqueta: 'Compra', tono: 'verde', bucket: 'b' }],
    },
    diseno: null,
    visibilidad: {
      fees: { ver: 'todos' },
      comision: { ver: 'todos' },
      tasa: { ver: 'costos' },
      cif: { ver: 'costos' },
    },
    tonos: ['verde'],
  },
  tonos: [{ clave: 'verde', nombre: 'Verde' }],
  ...extra,
})
const origen = { id: 'o', nombre: 'Origen' }

describe('lecturaDeLaTarjetaDeTrabajo', () => {
  it('sin borrador ni publicada, o sin fórmula publicada, no hay tarjeta', () => {
    expect(lecturaDeLaTarjetaDeTrabajo(lectura(), origen)).toEqual({ estado: 'sin_tarjeta' })
    expect(
      lecturaDeLaTarjetaDeTrabajo(
        lectura({ formula: null, contexto: null, publicada: version(cuadricula(['fees'])) }),
        origen,
      ),
    ).toEqual({ estado: 'sin_tarjeta' })
  })

  it('el borrador antes que la publicada', () => {
    const r = lecturaDeLaTarjetaDeTrabajo(
      lectura({
        publicada: version(cuadricula(['fees']), { version: 3 }),
        borrador: version(cuadricula(['fees', 'comision'])),
      }),
      origen,
    )
    expect(r.estado).toBe('lista')
    if (r.estado !== 'lista') return
    expect(r.lectura.definicion.filas.map((f) => f.nodo)).toEqual(['fees', 'comision'])
  })

  it('sin borrador, la publicada', () => {
    const r = lecturaDeLaTarjetaDeTrabajo(
      lectura({ publicada: version(cuadricula(['fees']), { version: 3 }) }),
      origen,
    )
    expect(r.estado === 'lista' ? r.lectura.definicion.filas.map((f) => f.nodo) : null).toEqual([
      'fees',
    ])
  })

  it('sólo lo del nivel «todos»: un nodo restringido y el pct restringido de un par no viajan', () => {
    const r = lecturaDeLaTarjetaDeTrabajo(
      lectura({ borrador: version(cuadricula(['fees', 'comision', 'cif'], true)) }),
      origen,
    )
    expect(r.estado).toBe('lista')
    if (r.estado !== 'lista') return
    expect(r.lectura.nodos.map((n) => n.id)).toEqual(['fees', 'comision'])
    expect(r.lectura.nodos.find((n) => n.id === 'comision')?.pct).toBeNull()
  })

  it('con el pct del nivel «todos», el pct viaja', () => {
    const base = lectura()
    const contexto = base.contexto
    if (contexto === null) throw new Error('sin contexto')
    const r = lecturaDeLaTarjetaDeTrabajo(
      lectura({
        borrador: version(cuadricula(['comision'], true)),
        contexto: { ...contexto, visibilidad: { ...contexto.visibilidad, tasa: { ver: 'todos' } } },
      }),
      origen,
    )
    expect(r.estado === 'lista' ? r.lectura.nodos[0]?.pct : null).toBe('tasa')
  })
})

describe('lecturaDeLaTarjetaDeTrabajo y los tipos de cambio', () => {
  it('el tipo de cambio restringido de un bucket no viaja: ni su nodo ni su nombre', () => {
    const base = lectura()
    const contexto = base.contexto
    if (contexto === null) throw new Error('sin contexto')
    const conCambio: PlantillaEnCuadricula = {
      ...cuadricula(['fees']),
      celdas: [
        ...cuadricula(['fees']).celdas,
        {
          id: 'tc_fees',
          fila: 'f_fees',
          columna: 'b',
          contenido: { tipo: 'dato', nodo: 'fees', mostrar: 'tc_nombre' },
        },
      ],
    }
    const r = lecturaDeLaTarjetaDeTrabajo(
      lectura({
        borrador: version(conCambio),
        contexto: {
          ...contexto,
          definicion: {
            ...contexto.definicion,
            nodos: [
              ...(contexto.definicion.nodos ?? []),
              { id: 'tc_x', etiqueta: 'TC secreto', tipo: 'tipo_cambio' },
            ],
            buckets: { b: 'tc_x' },
          },
          visibilidad: { ...contexto.visibilidad, tc_x: { ver: 'costos' } },
        },
      }),
      origen,
    )
    expect(r.estado).toBe('lista')
    if (r.estado !== 'lista') return
    expect(r.lectura.tiposDeCambio.buckets).toEqual([{ bucket: 'b', nombre: null, nodo: null }])
  })
})
