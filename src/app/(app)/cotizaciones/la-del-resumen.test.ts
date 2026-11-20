import { describe, expect, it } from 'vitest'
import type { CotizacionDelListado } from '@/modules/cotizaciones'
import { conLaDelResumen } from './la-del-resumen'

const ID_A = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const ID_B = '3a2d4b5c-6e7f-4081-9bac-1d2e3f4a5b6c'

const una = (id: string): CotizacionDelListado => ({
  id,
  numero: 1,
  origenId: '00000000-0000-4000-8000-0000000000aa',
  leadId: null,
  vehiculoId: null,
  creadoPor: '00000000-0000-4000-8000-0000000000bb',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  totalBase: 100,
  monedaMostrar: null,
  creadoEn: '2026-03-01T12:00:00.123456+00:00',
  venceEl: '2026-04-01',
  vencida: false,
  privada: false,
  cliente: null,
  vehiculo: null,
  autor: 'Ana',
  aprobada: false,
  modo: null,
})

describe('conLaDelResumen', () => {
  const pagina = [una(ID_A)]

  it('suma la que leyó el servidor, al final', () => {
    const delResumen = una(ID_B)
    expect(conLaDelResumen(pagina, { id: ID_B, estado: 'listo', cotizacion: delResumen })).toEqual([
      pagina[0],
      delResumen,
    ])
  })

  it('sin lectura, sin la cotización o si ya está en la página, deja la página tal cual', () => {
    expect(conLaDelResumen(pagina, null)).toBe(pagina)
    expect(conLaDelResumen(pagina, { id: ID_B, estado: 'no_disponible' })).toBe(pagina)
    expect(conLaDelResumen(pagina, { id: ID_B, estado: 'error' })).toBe(pagina)
    expect(conLaDelResumen(pagina, { id: ID_A, estado: 'listo', cotizacion: una(ID_A) })).toBe(
      pagina,
    )
  })
})
