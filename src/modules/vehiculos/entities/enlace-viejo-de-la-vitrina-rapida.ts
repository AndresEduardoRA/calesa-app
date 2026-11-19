// Un enlace viejo al panel chico de publicar del inventario (`/vehiculos?panel=vitrina-rapida&para=<id>`): la lista ya abre el panel completo de la vitrina
// (`?panel=vitrina&para=<id>`), así que el enlace guardado redirige ahí y conserva el resto de su consulta (origen, filtros, cursor). Lo llama
// `src/app/(app)/vehiculos/page.tsx` con `redirigir()`. Sin I/O.
import { z } from 'zod'
import { RUTAS } from '@/shared/lib/rutas'

export const PANEL_VIEJO_DE_LA_VITRINA = 'vitrina-rapida'
// El literal es `PANEL_DE_VITRINA` de `features/vitrina/claves.ts` (`entities` no importa `features`).
const PANEL_DE_LA_VITRINA = 'vitrina'

type Parametros = Readonly<Record<string, string | readonly string[] | undefined>>

/**
 * A dónde lleva `?panel=vitrina-rapida`: lo mismo con `panel=vitrina`. Un `para` que no es un id se quita junto con el panel (no abre nada). Sin ese panel, null:
 * no es un enlace viejo. Un `?vehiculo=` (el resumen viejo) lo resuelve antes `destinoDelEnlaceViejo()`.
 */
export function destinoDeLaVitrinaRapida(parametros: Parametros): string | null {
  if (parametros['panel'] !== PANEL_VIEJO_DE_LA_VITRINA) {
    return null
  }
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    for (const uno of typeof valor === 'string' ? [valor] : (valor ?? [])) {
      consulta.append(clave, uno)
    }
  }
  const para = parametros['para']
  if (typeof para === 'string' && z.guid().safeParse(para).success) {
    consulta.set('panel', PANEL_DE_LA_VITRINA)
  } else {
    consulta.delete('panel')
    consulta.delete('para')
  }
  return consulta.size === 0 ? RUTAS.vehiculos : `${RUTAS.vehiculos}?${consulta.toString()}`
}
