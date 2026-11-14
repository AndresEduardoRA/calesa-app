import { describe, expect, it } from 'vitest'
import { marcasDeLaPaginaDesde } from './marcas-de-la-pagina'

const A = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const B = '1c8b3a1f-2d3e-4f60-9bac-1d2e3f4a5b6c'
const fila = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  actualizado_en: '2026-11-14T10:00:00.123456+00:00',
  estado: 'activa',
  reportes_count: 0,
  ...extra,
})

describe('marcasDeLaPaginaDesde', () => {
  it('une la fila, la favorita y el reporte propio por id, con la versión tal cual', () => {
    const mapa = marcasDeLaPaginaDesde({
      cotizaciones: [fila(A), fila(B, { estado: 'invalida', reportes_count: 2 })],
      favoritas: [{ cotizacion_id: B }],
      reportes: [{ cotizacion_id: A, motivo: 'Precio raro' }],
    })
    expect(mapa?.get(A)).toEqual({
      actualizadoEn: '2026-11-14T10:00:00.123456+00:00',
      estado: 'activa',
      reportesCount: 0,
      favorita: false,
      miMotivo: 'Precio raro',
    })
    expect(mapa?.get(B)).toMatchObject({
      estado: 'invalida',
      reportesCount: 2,
      favorita: true,
      miMotivo: null,
    })
  })

  it('un reporte sin motivo (de antes del 4.27-1) es un motivo vacío, no «no reportó»', () => {
    const mapa = marcasDeLaPaginaDesde({
      cotizaciones: [fila(A)],
      favoritas: [],
      reportes: [{ cotizacion_id: A, motivo: null }],
    })
    expect(mapa?.get(A)?.miMotivo).toBe('')
  })

  it('una cotización que no llegó no está en el mapa', () => {
    const mapa = marcasDeLaPaginaDesde({ cotizaciones: [fila(A)], favoritas: [], reportes: [] })
    expect(mapa?.has(B)).toBe(false)
  })

  it('una forma rota es nulo: nunca marcas inventadas', () => {
    expect(
      marcasDeLaPaginaDesde({
        cotizaciones: [fila(A, { estado: 'rara' })],
        favoritas: [],
        reportes: [],
      }),
    ).toBeNull()
    expect(
      marcasDeLaPaginaDesde({ cotizaciones: [fila('x')], favoritas: [], reportes: [] }),
    ).toBeNull()
    expect(marcasDeLaPaginaDesde({ cotizaciones: [], favoritas: 3, reportes: [] })).toBeNull()
    expect(marcasDeLaPaginaDesde({ cotizaciones: [], favoritas: [], reportes: null })).toBeNull()
  })
})
