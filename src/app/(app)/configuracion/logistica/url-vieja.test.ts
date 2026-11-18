import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja } from './url-vieja'

const abiertos = [
  { clave: 'puertos', ruta: '/configuracion/logistica/puertos' },
  { clave: 'navieras', ruta: '/configuracion/logistica/navieras' },
  { clave: 'categorias-de-gasto', ruta: '/configuracion/logistica/categorias-de-gasto' },
]

describe('la URL vieja de Configuración › Logística', () => {
  it('`?seccion=` va a la sub-ruta de su catálogo', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'navieras' }, abiertos)).toBe(
      '/configuracion/logistica/navieras',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'categorias-de-gasto' }, abiertos)).toBe(
      '/configuracion/logistica/categorias-de-gasto',
    )
  })

  it('conserva el panel que traía', () => {
    expect(
      destinoDeLaUrlVieja(
        { seccion: 'navieras', panel: 'editar-naviera', naviera: 'n-1' },
        abiertos,
      ),
    ).toBe('/configuracion/logistica/navieras?panel=editar-naviera&naviera=n-1')
  })

  it('sin `seccion`, o con una ajena, abre el primero (y conserva el panel)', () => {
    expect(destinoDeLaUrlVieja({}, abiertos)).toBe('/configuracion/logistica/puertos')
    expect(destinoDeLaUrlVieja({ seccion: 'basura' }, abiertos)).toBe(
      '/configuracion/logistica/puertos',
    )
    expect(destinoDeLaUrlVieja({ panel: 'nuevo-puerto' }, abiertos)).toBe(
      '/configuracion/logistica/puertos?panel=nuevo-puerto',
    )
  })

  it('un catálogo que la persona no puede abrir va al primero que sí', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'puertos' }, abiertos.slice(1))).toBe(
      '/configuracion/logistica/navieras',
    )
  })

  it('sin ningún catálogo que abrir, no hay destino', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'puertos' }, [])).toBeNull()
  })
})
