import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja, type ParametrosViejos } from './url-vieja'

const ID = '00000000-0000-4000-8000-000000000001'

describe('destinoDeLaUrlVieja', () => {
  it('cada pestaña vieja va a su sub-ruta', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'empresa' })).toBe('/configuracion/empresa')
    expect(destinoDeLaUrlVieja({ seccion: 'monedas' })).toBe('/configuracion/empresa/monedas')
    expect(destinoDeLaUrlVieja({ seccion: 'integraciones' })).toBe(
      '/configuracion/empresa/integraciones',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'comprobantes' })).toBe(
      '/configuracion/empresa/comprobantes',
    )
  })

  it('los paneles de Monedas van a Monedas con su parámetro, con o sin `seccion`', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'monedas', tc: ID })).toBe(
      `/configuracion/empresa/monedas?tc=${ID}`,
    )
    expect(destinoDeLaUrlVieja({ tc: ID })).toBe(`/configuracion/empresa/monedas?tc=${ID}`)
    expect(destinoDeLaUrlVieja({ moneda: 'EUR' })).toBe('/configuracion/empresa/monedas?moneda=EUR')
    expect(destinoDeLaUrlVieja({ panel: 'nueva-moneda' })).toBe(
      '/configuracion/empresa/monedas?panel=nueva-moneda',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'empresa', panel: 'nuevo-tipo-cambio' })).toBe(
      '/configuracion/empresa/monedas?panel=nuevo-tipo-cambio',
    )
  })

  it('un panel que no es de Monedas no viaja', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'monedas', panel: 'otro' })).toBe(
      '/configuracion/empresa/monedas',
    )
    expect(destinoDeLaUrlVieja({ panel: 'otro' })).toBeNull()
  })

  it('sin nada viejo, o con una pestaña que no existe, no redirige', () => {
    expect(destinoDeLaUrlVieja({})).toBeNull()
    expect(destinoDeLaUrlVieja({ seccion: 'otra' })).toBeNull()
  })

  it('ningún destino vuelve a redirigir', () => {
    const casos: ParametrosViejos[] = [
      { seccion: 'empresa' },
      { seccion: 'monedas', tc: ID, moneda: 'EUR', panel: 'nueva-moneda' },
      { seccion: 'integraciones', tc: ID },
      { seccion: 'comprobantes' },
      { tc: ID },
    ]
    for (const caso of casos) {
      const destino = destinoDeLaUrlVieja(caso)
      expect(destino).not.toBeNull()
      const url = new URL(destino ?? '', 'https://app.test')
      expect(url.searchParams.has('seccion')).toBe(false)
      if (url.pathname === '/configuracion/empresa') {
        const otraVez = destinoDeLaUrlVieja({
          tc: url.searchParams.get('tc') ?? undefined,
          moneda: url.searchParams.get('moneda') ?? undefined,
          panel: url.searchParams.get('panel') ?? undefined,
        })
        expect(otraVez).toBeNull()
      }
    }
  })
})
