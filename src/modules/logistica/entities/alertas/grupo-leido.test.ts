import { describe, expect, it } from 'vitest'
import { claveDeLaFila, grupoLeidoDesde } from './grupo-leido'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const sobre = (filas: unknown[], extra: Record<string, unknown> = {}) => ({
  filas,
  hay_mas: false,
  siguiente: null,
  cortada: false,
  conteo: null,
  ...extra,
})

const demorada = {
  id: A,
  origen_id: B,
  titulo: 'Hilux',
  fase_id: C,
  fase: 'Tránsito',
  fase_desde: '2026-11-01T10:00:00+00:00',
  situacion: 'fase',
  dias: 5,
}

describe('grupoLeidoDesde', () => {
  it('lee un grupo de demorados con su cursor y su conteo', () => {
    const leido = grupoLeidoDesde(
      'demorados',
      sobre([demorada], {
        hay_mas: true,
        siguiente: { desde: '2026-11-06T10:00:00+00:00', id: A },
        conteo: { n: 100, hay_mas: true },
      }),
    )
    expect(leido.ok).toBe(true)
    if (!leido.ok) return
    expect(leido.data.hayMas).toBe(true)
    expect(leido.data.siguiente).toEqual({ desde: '2026-11-06T10:00:00+00:00', id: A })
    expect(leido.data.conteo).toEqual({ n: 100, hayMas: true })
    expect(leido.data.filas[0]).toMatchObject({
      grupo: 'demorados',
      vehiculoId: A,
      origenId: B,
      nombre: 'Hilux',
      fase: 'Tránsito',
      dias: 5,
    })
  })
})

describe('grupoLeidoDesde, cada grupo', () => {
  it('lee cada grupo con sus campos', () => {
    const casos: Array<[Parameters<typeof grupoLeidoDesde>[0], Record<string, unknown>]> = [
      ['trabados', { ...demorada, fase_siguiente: 'Aduana', motivo: 'Documento: BL' }],
      [
        'por_aprobar',
        {
          documento_id: A,
          vehiculo_id: B,
          origen_id: C,
          titulo: 'Hilux',
          tipo: 'BL',
          creado_en: '2026-11-01T10:00:00+00:00',
        },
      ],
      [
        'por_vencer',
        {
          documento_id: A,
          vehiculo_id: B,
          origen_id: C,
          titulo: 'Hilux',
          tipo: 'Seguro',
          vence_el: '2026-12-01',
          modo: 'renovar',
        },
      ],
      [
        'llegadas',
        {
          vehiculo_id: A,
          origen_id: B,
          titulo: 'Hilux',
          fase: 'Tránsito',
          eta_el: '2026-11-10',
          contenedor: null,
        },
      ],
      [
        'salidas',
        {
          vehiculo_id: A,
          origen_id: B,
          titulo: 'Hilux',
          fase: null,
          zarpe_el: '2026-11-14',
          booking: 'BK1',
          contenedor: null,
        },
      ],
      [
        'sin_resolver',
        { vehiculo_id: A, origen_id: B, titulo: 'Hilux', creado_en: '2026-11-01T10:00:00+00:00' },
      ],
    ]
    for (const [grupo, fila] of casos) {
      const leido = grupoLeidoDesde(grupo, sobre([fila]))
      expect(leido.ok, grupo).toBe(true)
      if (leido.ok) expect(leido.data.filas[0]?.grupo).toBe(grupo)
    }
  })
})

describe('grupoLeidoDesde, bordes', () => {
  it('el grupo vacío es válido y la clave de una fila es su documento o su vehículo', () => {
    expect(grupoLeidoDesde('salidas', sobre([]))).toMatchObject({
      ok: true,
      data: { filas: [], cortada: false },
    })
    const doc = grupoLeidoDesde(
      'por_aprobar',
      sobre([
        {
          documento_id: A,
          vehiculo_id: B,
          origen_id: C,
          titulo: 'x',
          tipo: 'BL',
          creado_en: '2026-11-01T10:00:00+00:00',
        },
      ]),
    )
    const veh = grupoLeidoDesde('demorados', sobre([demorada]))
    expect(doc.ok && doc.data.filas[0] && claveDeLaFila(doc.data.filas[0])).toBe(A)
    expect(veh.ok && veh.data.filas[0] && claveDeLaFila(veh.data.filas[0])).toBe(A)
  })

  it('una forma ajena es «inesperado», nunca una fila cortada', () => {
    for (const malo of [
      null,
      {},
      sobre([{ ...demorada, id: 'no-es-guid' }]),
      sobre([{ ...demorada, dias: 'cinco' }]),
      sobre([demorada], { siguiente: { desde: 'x', id: 'no-es-guid' } }),
      sobre([demorada], { conteo: { n: -1, hay_mas: false } }),
      { ...sobre([]), cortada: 'sí' },
    ]) {
      const leido = grupoLeidoDesde('demorados', malo)
      expect(leido.ok).toBe(false)
      if (!leido.ok) expect(leido.error.codigo).toBe('inesperado')
    }
    // Una fila de otro grupo no pasa por la de éste.
    expect(grupoLeidoDesde('por_vencer', sobre([demorada])).ok).toBe(false)
  })
})
