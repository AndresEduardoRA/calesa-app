import { describe, expect, it } from 'vitest'
import configuracion from '../../../../../next.config'
import { RUTAS } from '@/shared/lib/rutas'

describe('/configuracion/origenes?panel=nuevo', () => {
  it('redirige en el servidor, de forma permanente (308), a la página del primer paso de la puesta en marcha', async () => {
    const redirecciones = (await configuracion('phase-development-server').redirects?.()) ?? []
    const suya = redirecciones.find(
      (r) => r.source === RUTAS.origenes && r.has?.some((c) => c.type === 'query'),
    )
    expect(suya).toEqual({
      source: RUTAS.origenes,
      has: [{ type: 'query', key: 'panel', value: 'nuevo' }],
      destination: RUTAS.nuevoOrigen,
      permanent: true,
    })
    // Sólo con `?panel=nuevo`: la lista sin él no redirige. Next conserva la consulta de la URL al redirigir (no hay `:path*` ni consulta en el destino).
    expect(redirecciones.filter((r) => r.source === RUTAS.origenes && r.has === undefined)).toEqual(
      [],
    )
  })
})
