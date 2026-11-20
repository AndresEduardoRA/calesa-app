import { describe, expect, it } from 'vitest'
import configuracion from '../../../../next.config'
import { RUTAS } from '@/shared/lib/rutas'

describe('/configuracion', () => {
  it('redirige en el servidor, de forma permanente (308), al inicio de Configuración', async () => {
    const redirecciones = (await configuracion('phase-development-server').redirects?.()) ?? []
    const suya = redirecciones.find((r) => r.source === '/configuracion')
    expect(suya).toEqual({
      source: '/configuracion',
      destination: RUTAS.inicioDeConfiguracion,
      permanent: true,
    })
    // Next conserva la consulta de la URL al redirigir; la fuente no lleva `:path*`, así que `/configuracion/<sección>` no se toca.
    expect(redirecciones.filter((r) => r.source.startsWith('/configuracion/inicio'))).toEqual([])
  })
})
