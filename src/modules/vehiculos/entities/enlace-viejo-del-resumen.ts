// Un enlace viejo al resumen del inventario (`/vehiculos?vehiculo=<id>`): la lista ya no tiene resumen y abre la ficha, así que el enlace
// guardado redirige a `/vehiculos/<id>` con lo que pedía y la ficha sabe abrir. Lo llama `src/app/(app)/vehiculos/page.tsx` con `redirigir()`.
import { RUTAS } from '@/shared/lib/rutas'
import { PANEL_DESVINCULAR } from './vehiculos-del-lead'

export const CLAVE_DEL_ENLACE_VIEJO = 'vehiculo'
// El resumen tuvo pestañas (`?pestana=fotos`): `fotos` abre el visor de la ficha y otra se quita.
export const CLAVE_DE_PESTANA_VIEJA = 'pestana'

// Los `?panel=` que la ficha abre. Los literales son los de `features/` (`entities` no los importa: viven en archivos de cliente):
// `PANEL_DE_VITRINA`, `PANEL_DE_FECHAS_DE_SUBASTA`, `PANEL_VINCULAR_LEAD` y `PANEL_MARCAR_INTERESADO`; `e2e/vehiculos-sin-resumen.spec.ts` abre uno.
export const PANELES_DE_LA_FICHA: ReadonlySet<string> = new Set([
  'vitrina',
  'fechas-de-subasta',
  PANEL_DESVINCULAR,
  'vincular-lead',
  'marcar-interesado',
])

export type EnlaceViejo = {
  vehiculo: string | undefined
  panel?: string | undefined
  visor?: string | undefined
  foto?: string | undefined
  pestana?: string | undefined
  editar?: string | undefined
}

const ES_NUMERO_DE_FOTO = /^[1-9]\d{0,2}$/

// El visor que pedía el enlace, con la clave del carrusel de la ficha (el id del vehículo): el del resumen era `<id>-resumen`; sin visor, un
// `?pestana=fotos` abre la primera foto, como hacía el resumen.
function visorDe({ vehiculo, visor, foto, pestana }: EnlaceViejo): { foto: string } | null {
  if (visor === `${vehiculo ?? ''}-resumen` || visor === vehiculo) {
    return { foto: foto !== undefined && ES_NUMERO_DE_FOTO.test(foto) ? foto : '' }
  }
  if (visor === undefined && pestana === 'fotos') {
    return { foto: '1' }
  }
  return null
}

/**
 * A dónde lleva un enlace viejo: la ficha del vehículo con el panel que la ficha abre, el visor de sus fotos y su edición (`?editar=<id>`, del
 * mismo vehículo); lo demás (origen, filtros, cursor, otra pestaña, otro panel) se quita. Sin `?vehiculo=`, null: no es un enlace viejo. Un valor
 * que no es un id redirige igual, codificado: la ficha dice que no está disponible.
 */
export function destinoDelEnlaceViejo(enlace: EnlaceViejo): string | null {
  const { vehiculo, panel, editar } = enlace
  if (vehiculo === undefined || vehiculo === '') {
    return null
  }
  const consulta = new URLSearchParams()
  if (panel !== undefined && PANELES_DE_LA_FICHA.has(panel)) {
    consulta.set('panel', panel)
  }
  const visor = visorDe(enlace)
  if (visor !== null) {
    consulta.set('visor', vehiculo)
    if (visor.foto !== '') {
      consulta.set('foto', visor.foto)
    }
  }
  if (editar === vehiculo) {
    consulta.set('editar', vehiculo)
  }
  const ficha = `${RUTAS.vehiculos}/${encodeURIComponent(vehiculo)}`
  return consulta.size === 0 ? ficha : `${ficha}?${consulta.toString()}`
}
