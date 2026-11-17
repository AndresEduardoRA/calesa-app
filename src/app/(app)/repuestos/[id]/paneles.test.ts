import { describe, expect, it, vi } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import {
  panelAbiertoDe,
  panelesDisponibles,
  redireccionDeEnlaceViejo,
  rutaDeRegistrarCompra,
  rutaDelPanel,
} from './paneles'

// Las constantes llegan por el `index.ts` de los módulos, que alcanza su composición (`server-only`): en Vitest el import llega entero y cae.
vi.mock('server-only', () => ({}))

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))
const P = '11111111-1111-4111-8111-111111111111'

describe('los paneles bajo los pasos', () => {
  it('sin `repuestos.costos.ver` ni `repuestos.cotizar`, ninguno: la URL no abre nada', () => {
    const disponibles = panelesDisponibles(con('repuestos.ver'))
    expect(disponibles).toEqual([])
    expect(panelAbiertoDe('compras', disponibles)).toBeNull()
    expect(panelAbiertoDe('pagos', disponibles)).toBeNull()
  })

  it('con `repuestos.costos.ver`, Pagos y Compras; Cotizaciones sólo con `repuestos.cotizar`', () => {
    expect(panelesDisponibles(con('repuestos.costos.ver'))).toEqual(['pagos', 'compras'])
    expect(panelesDisponibles(con('repuestos.cotizar'))).toEqual(['cotizaciones'])
    expect(panelesDisponibles(con('repuestos.costos.ver', 'repuestos.cotizar'))).toEqual([
      'cotizaciones',
      'pagos',
      'compras',
    ])
  })

  it('`items`, un valor ajeno o ninguno: sólo la hoja', () => {
    const todos = panelesDisponibles(con('repuestos.costos.ver', 'repuestos.cotizar'))
    expect(panelAbiertoDe('cotizaciones', todos)).toBe('cotizaciones')
    expect(panelAbiertoDe('items', todos)).toBeNull()
    expect(panelAbiertoDe('nada', todos)).toBeNull()
    expect(panelAbiertoDe(undefined, todos)).toBeNull()
  })
})

describe('los enlaces viejos', () => {
  const todos = panelesDisponibles(con('repuestos.costos.ver', 'repuestos.cotizar'))

  it('`?panel=compra` sin pestaña va con `pestana=compras`, conservando lo demás', () => {
    expect(redireccionDeEnlaceViejo(P, { panel: 'compra', compra: 'nueva' }, todos)).toBe(
      `/repuestos/${P}?panel=compra&compra=nueva&pestana=compras`,
    )
  })

  it('los paneles de pagos van con `pestana=pagos`', () => {
    for (const panel of ['pago', 'confirmar-pago', 'eliminar-pago', 'anular-pago']) {
      expect(redireccionDeEnlaceViejo(P, { panel, pago: 'x' }, todos)).toBe(
        `/repuestos/${P}?panel=${panel}&pago=x&pestana=pagos`,
      )
    }
  })

  it('con pestaña, otro panel o sin permiso: no se redirige', () => {
    expect(redireccionDeEnlaceViejo(P, { panel: 'compra', pestana: 'compras' }, todos)).toBeNull()
    expect(redireccionDeEnlaceViejo(P, { panel: 'stock', item: 'x' }, todos)).toBeNull()
    expect(redireccionDeEnlaceViejo(P, {}, todos)).toBeNull()
    expect(redireccionDeEnlaceViejo(P, { panel: 'compra' }, [])).toBeNull()
  })
})

describe('las rutas de un panel', () => {
  it('el panel y, para registrar una compra, el ítem ya elegido', () => {
    expect(rutaDelPanel(P, 'compras')).toBe(`/repuestos/${P}?pestana=compras`)
    expect(rutaDeRegistrarCompra(P, 'i1')).toBe(
      `/repuestos/${P}?pestana=compras&panel=compra&compra=nueva&item_de_compra=i1`,
    )
  })
})
