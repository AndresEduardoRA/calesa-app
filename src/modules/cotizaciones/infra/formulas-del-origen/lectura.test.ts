import { describe, expect, it, vi } from 'vitest'
import type { Cliente } from './piezas'

vi.mock('server-only', () => ({}))

const { leerFormulasDelOrigenSobre } = await import('./lista')
const { leerLaFormulaDelOrigenSobre } = await import('./formula')

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const HORA = '2026-11-20T15:00:00.123456+00:00'

type Fila = Record<string, unknown>
type Llamada = { tabla: string; filtros: string[]; limite: number | null }

// Un PostgREST de juguete: `eq`, `is`, `not … is null`, `in`, `order` (sin efecto: las filas ya vienen en orden) y `limit`.
function clienteSimulado(datos: Record<string, Fila[]>) {
  const llamadas: Llamada[] = []
  const cliente = {
    from(tabla: string) {
      const llamada: Llamada = { tabla, filtros: [], limite: null }
      llamadas.push(llamada)
      let filas = [...(datos[tabla] ?? [])]
      const c = {
        select: () => c,
        eq(col: string, v: unknown) {
          llamada.filtros.push(`eq:${col}`)
          filas = filas.filter((f) => f[col] === v)
          return c
        },
        is(col: string) {
          llamada.filtros.push(`is:${col}`)
          filas = filas.filter((f) => f[col] === null)
          return c
        },
        not(col: string) {
          llamada.filtros.push(`not:${col}`)
          filas = filas.filter((f) => f[col] !== null)
          return c
        },
        in(col: string, vs: unknown[]) {
          llamada.filtros.push(`in:${col}`)
          filas = filas.filter((f) => vs.includes(f[col]))
          return c
        },
        order: () => c,
        limit(n: number) {
          llamada.limite = n
          return Promise.resolve({ data: filas.slice(0, n), error: null })
        },
      }
      return c
    },
  }
  return { cliente: cliente as unknown as Cliente, llamadas }
}

const formulaDelOrigen = (n: number, extra: Fila = {}): Fila => ({
  id: id(n),
  origen_id: ORIGEN,
  nombre: `Fórmula ${String(n)}`,
  activa: false,
  activada_en: null,
  archivada_en: null,
  copiada_de_otro_origen: false,
  actualizado_en: HORA,
  ...extra,
})
const pieza = (n: number, de: number, estado: string, version: number | null): Fila => ({
  id: id(n),
  formula_del_origen_id: id(de),
  estado,
  version,
  actualizado_en: HORA,
})

describe('leerFormulasDelOrigenSobre', () => {
  it('une a cada fórmula su borrador y su publicada, y dice si hay archivadas', async () => {
    const { cliente, llamadas } = clienteSimulado({
      formulas_del_origen: [
        formulaDelOrigen(1, { activa: true }),
        formulaDelOrigen(2),
        formulaDelOrigen(3, { archivada_en: HORA }),
      ],
      formulas: [
        pieza(10, 1, 'publicada', 3),
        pieza(11, 1, 'borrador', null),
        pieza(12, 2, 'borrador', null),
      ],
      plantillas_tarjeta: [pieza(20, 1, 'publicada', 1)],
    })
    const r = await leerFormulasDelOrigenSobre(cliente, ORIGEN)
    expect(r.ok && r.data.hayArchivadas).toBe(true)
    expect(r.ok && r.data.hayMas).toBe(false)
    expect(r.ok && r.data.formulas.map((f) => f.id)).toEqual([id(1), id(2)])
    expect(r.ok && r.data.formulas[0]).toMatchObject({
      formula: {
        publicada: { id: id(10), version: 3 },
        borrador: { id: id(11), actualizadoEn: HORA },
      },
      tarjeta: { publicada: { id: id(20), version: 1 }, borrador: null },
    })
    expect(r.ok && r.data.formulas[1]).toMatchObject({
      formula: { publicada: null, borrador: { id: id(12) } },
      tarjeta: { publicada: null, borrador: null },
    })
    // Cada lectura con su tope: la lista pide 51; las piezas, dos por fórmula.
    expect(llamadas.map((l) => [l.tabla, l.limite])).toEqual([
      ['formulas_del_origen', 51],
      ['formulas_del_origen', 1],
      ['formulas', 4],
      ['plantillas_tarjeta', 4],
    ])
  })

  it('sin fórmulas no pide piezas', async () => {
    const { cliente, llamadas } = clienteSimulado({})
    const r = await leerFormulasDelOrigenSobre(cliente, ORIGEN)
    expect(r).toEqual({ ok: true, data: { formulas: [], hayMas: false, hayArchivadas: false } })
    expect(llamadas.map((l) => l.tabla)).toEqual(['formulas_del_origen', 'formulas_del_origen'])
  })

  it('un origen que no es un id no llega a la base', async () => {
    const { cliente, llamadas } = clienteSimulado({})
    expect((await leerFormulasDelOrigenSobre(cliente, 'x')).ok).toBe(false)
    expect(llamadas).toEqual([])
  })
})

describe('leerLaFormulaDelOrigenSobre', () => {
  it('lee la fórmula por su id y origen, con la activa del origen', async () => {
    const { cliente } = clienteSimulado({
      formulas_del_origen: [formulaDelOrigen(1, { activa: true }), formulaDelOrigen(2)],
    })
    const r = await leerLaFormulaDelOrigenSobre(cliente, ORIGEN, id(2))
    expect(r.ok && r.data).toMatchObject({
      formula: { id: id(2), nombre: 'Fórmula 2' },
      activa: { id: id(1), nombre: 'Fórmula 1' },
    })
  })

  it('la de otro origen, la que no existe o un id que no es un id: nula', async () => {
    const { cliente } = clienteSimulado({
      formulas_del_origen: [formulaDelOrigen(1, { origen_id: id(99) })],
    })
    expect(await leerLaFormulaDelOrigenSobre(cliente, ORIGEN, id(1))).toEqual({
      ok: true,
      data: null,
    })
    expect(await leerLaFormulaDelOrigenSobre(cliente, ORIGEN, 'x')).toEqual({
      ok: true,
      data: null,
    })
  })
})
