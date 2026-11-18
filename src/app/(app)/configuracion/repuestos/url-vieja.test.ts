import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja } from './url-vieja'

describe('la URL vieja de Configuración › Repuestos', () => {
  it('sin `seccion`, o con una ajena, abre Catálogos', () => {
    expect(destinoDeLaUrlVieja({})).toBe('/configuracion/repuestos/catalogos')
    expect(destinoDeLaUrlVieja({ seccion: 'basura' })).toBe('/configuracion/repuestos/catalogos')
    expect(destinoDeLaUrlVieja({ seccion: 'catalogos' })).toBe('/configuracion/repuestos/catalogos')
  })

  it('`?seccion=cotizador` abre el cotizador', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'cotizador' })).toBe('/configuracion/repuestos/cotizador')
  })

  it('los paneles de los catálogos viajan a Catálogos', () => {
    expect(destinoDeLaUrlVieja({ panel: 'nuevo-valor', catalogo: 'tipo-de-pieza' })).toBe(
      '/configuracion/repuestos/catalogos?panel=nuevo-valor&catalogo=tipo-de-pieza',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'catalogos', panel: 'editar-valor', valor: 'v-1' })).toBe(
      '/configuracion/repuestos/catalogos?panel=editar-valor&valor=v-1',
    )
  })

  it('los de tramo y caja viajan al cotizador, con su moneda', () => {
    expect(
      destinoDeLaUrlVieja({ seccion: 'cotizador', panel: 'tramo', tramo: 'nuevo', moneda: 'USD' }),
    ).toBe('/configuracion/repuestos/cotizador?panel=tramo&tramo=nuevo&moneda=USD')
    expect(destinoDeLaUrlVieja({ seccion: 'cotizador', panel: 'caja', caja: 'c-1' })).toBe(
      '/configuracion/repuestos/cotizador?panel=caja&caja=c-1',
    )
  })
})
