import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja } from './url-vieja'

describe('las URLs de cuando Sitio web tenía pestañas', () => {
  it('cada ?seccion= va a su sub-ruta', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'ajustes' })).toBe('/configuracion/web/ajustes')
    expect(destinoDeLaUrlVieja({ seccion: 'legales' })).toBe('/configuracion/web/legales')
    expect(destinoDeLaUrlVieja({ seccion: 'guias' })).toBe('/configuracion/web/guias')
    expect(destinoDeLaUrlVieja({ seccion: 'faqs' })).toBe('/configuracion/web/faqs')
    expect(destinoDeLaUrlVieja({ seccion: 'testimonios' })).toBe('/configuracion/web/testimonios')
  })

  it('conserva el resto de la URL: los paneles y la búsqueda', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'faqs', panel: 'nueva-faq' })).toBe(
      '/configuracion/web/faqs?panel=nueva-faq',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'guias', panel: 'categorias', q: 'seguro' })).toBe(
      '/configuracion/web/guias?panel=categorias&q=seguro',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'ajustes', panel: 'seo' })).toBe(
      '/configuracion/web/ajustes?panel=seo',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'legales', panel: 'terminos' })).toBe(
      '/configuracion/web/legales?panel=terminos',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'testimonios', panel: undefined })).toBe(
      '/configuracion/web/testimonios',
    )
  })

  it('sin ?seccion=, o con una que no existe, no hay nada que mover', () => {
    expect(destinoDeLaUrlVieja({})).toBeNull()
    expect(destinoDeLaUrlVieja({ panel: 'nueva-faq' })).toBeNull()
    expect(destinoDeLaUrlVieja({ seccion: 'basura' })).toBeNull()
    expect(destinoDeLaUrlVieja({ seccion: 'constructor' })).toBeNull()
    expect(destinoDeLaUrlVieja({ seccion: 'toString' })).toBeNull()
  })

  it('con ?seccion= repetido manda el primero, y ningún destino lleva seccion (no vuelve a redirigir)', () => {
    expect(destinoDeLaUrlVieja({ seccion: ['legales', 'faqs'] })).toBe('/configuracion/web/legales')
    for (const seccion of ['ajustes', 'legales', 'guias', 'faqs', 'testimonios']) {
      expect(destinoDeLaUrlVieja({ seccion, panel: 'x' })).not.toContain('seccion')
    }
  })
})
