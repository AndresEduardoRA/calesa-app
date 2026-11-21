// Los paneles de `/configuracion/leads` (`?panel=`): una tarjeta, un panel. Son las claves de las seis sub-rutas que la página reemplazó
// (`/origenes`, `/tipos`, `/seguimientos`, `/embudo`, `/portal`, `/telefonos`): así su redirección es obvia.
import { RUTAS } from '@/shared/lib/rutas'
import { PANEL_RESTABLECER_EMBUDO, PANEL_RESTABLECER_PORTAL } from './ajustes-de-leads'
import { PANEL_EDITAR_ORIGEN, PANEL_ELIMINAR_ORIGEN, PANEL_NUEVO_ORIGEN } from './origen-de-lead'
import { PANEL_EDITAR_TIPO, PANEL_ELIMINAR_TIPO, PANEL_NUEVO_TIPO } from './tipo-de-lead'
import {
  PANEL_EDITAR_TIPO_DE_SEGUIMIENTO,
  PANEL_ELIMINAR_TIPO_DE_SEGUIMIENTO,
  PANEL_NUEVO_TIPO_DE_SEGUIMIENTO,
} from './tipo-de-seguimiento'

export const PANEL_DE_TIPOS = 'tipos'
export const PANEL_DE_ORIGENES = 'origenes'
export const PANEL_DE_SEGUIMIENTOS = 'seguimientos'
export const PANEL_DEL_EMBUDO = 'embudo'
export const PANEL_DEL_PORTAL = 'portal'
export const PANEL_DE_TELEFONOS = 'telefonos'
// La lista de «Números repetidos»: un modal aparte, que abre la tarjeta de Teléfonos extra.
export const PANEL_DE_NUMEROS_REPETIDOS = 'numeros-repetidos'

export const CLAVES_DE_LAS_FAMILIAS = [
  'tipos',
  'origenes',
  'seguimientos',
  'embudo',
  'portal',
  'telefonos',
] as const
export type ClaveDeFamilia = (typeof CLAVES_DE_LAS_FAMILIAS)[number]

// La familia de una tarjeta: su panel (el de la lista o el editor) y los que salen de él (uno de un ítem, uno de restablecer). Dentro de una
// familia hay un solo modal abierto a la vez: el del ítem reemplaza al de la lista, y al cerrarse vuelve a ella.
export type FamiliaDeLaConfiguracion = {
  // El `?panel=` de la tarjeta, el que abre «Editar».
  principal: string
  paneles: readonly string[]
}

export const FAMILIAS_DE_LA_CONFIGURACION: Readonly<
  Record<ClaveDeFamilia, FamiliaDeLaConfiguracion>
> = {
  tipos: {
    principal: PANEL_DE_TIPOS,
    paneles: [PANEL_DE_TIPOS, PANEL_NUEVO_TIPO, PANEL_EDITAR_TIPO, PANEL_ELIMINAR_TIPO],
  },
  origenes: {
    principal: PANEL_DE_ORIGENES,
    paneles: [PANEL_DE_ORIGENES, PANEL_NUEVO_ORIGEN, PANEL_EDITAR_ORIGEN, PANEL_ELIMINAR_ORIGEN],
  },
  seguimientos: {
    principal: PANEL_DE_SEGUIMIENTOS,
    paneles: [
      PANEL_DE_SEGUIMIENTOS,
      PANEL_NUEVO_TIPO_DE_SEGUIMIENTO,
      PANEL_EDITAR_TIPO_DE_SEGUIMIENTO,
      PANEL_ELIMINAR_TIPO_DE_SEGUIMIENTO,
    ],
  },
  embudo: { principal: PANEL_DEL_EMBUDO, paneles: [PANEL_DEL_EMBUDO, PANEL_RESTABLECER_EMBUDO] },
  portal: { principal: PANEL_DEL_PORTAL, paneles: [PANEL_DEL_PORTAL, PANEL_RESTABLECER_PORTAL] },
  telefonos: { principal: PANEL_DE_TELEFONOS, paneles: [PANEL_DE_TELEFONOS] },
}

export function esClaveDeFamilia(clave: string | null | undefined): clave is ClaveDeFamilia {
  return (CLAVES_DE_LAS_FAMILIAS as readonly (string | null | undefined)[]).includes(clave)
}

// La familia a la que pertenece un `?panel=`, o `null` si no es de la configuración de leads (un panel ajeno).
export function familiaDelPanel(panel: string | null | undefined): ClaveDeFamilia | null {
  if (panel === null || panel === undefined) {
    return null
  }
  return (
    CLAVES_DE_LAS_FAMILIAS.find((clave) =>
      FAMILIAS_DE_LA_CONFIGURACION[clave].paneles.includes(panel),
    ) ?? null
  )
}

// --- Las URLs de cuando Configuración › Leads eran pestañas y sub-rutas -------------------------------------------------------------------
// Siguen valiendo y conservan el resto de la URL (`?origen=`, `?tipo=`, `?campo=`…): ningún enlace profundo se pierde.
// - La sub-ruta vieja de una tarjeta (`/configuracion/leads/origenes`) y `?seccion=<tarjeta>` van a la raíz con `?panel=<tarjeta>`; si ya traían un
//   `?panel=` de esa tarjeta (`editar-origen`, `restablecer-portal`…), ése manda y se conserva todo. Un `?panel=` que no es de la tarjeta se descarta.
// - `?seccion=campos` va a la ruta de «Campos», con lo demás. Un `?seccion=` que no existe se quita.
// Ningún destino lleva `seccion`: no vuelve a redirigir.

function conBusqueda(ruta: string, busqueda: URLSearchParams): string {
  const texto = busqueda.toString()
  return texto === '' ? ruta : `${ruta}?${texto}`
}

function sinSeccion(parametros: URLSearchParams): URLSearchParams {
  const resto = new URLSearchParams(parametros)
  resto.delete('seccion')
  return resto
}

// A dónde manda la sub-ruta vieja de una tarjeta, con la consulta con que llegó.
export function destinoDeLaSubrutaVieja(
  clave: ClaveDeFamilia,
  parametros: URLSearchParams,
): string {
  const resto = sinSeccion(parametros)
  if (familiaDelPanel(resto.get('panel')) === clave) {
    return conBusqueda(RUTAS.configuracionDeLeads, resto)
  }
  resto.delete('panel')
  return conBusqueda(RUTAS.configuracionDeLeads, new URLSearchParams([['panel', clave], ...resto]))
}

// A dónde manda la raíz un `?seccion=` viejo; `null` si no trae `seccion` (la raíz dibuja las tarjetas).
export function destinoDeLaSeccionVieja(parametros: URLSearchParams): string | null {
  if (!parametros.has('seccion')) {
    return null
  }
  const seccion = parametros.get('seccion')
  if (seccion === 'campos') {
    return conBusqueda(RUTAS.camposDeLeads, sinSeccion(parametros))
  }
  if (esClaveDeFamilia(seccion)) {
    return destinoDeLaSubrutaVieja(seccion, parametros)
  }
  return conBusqueda(RUTAS.configuracionDeLeads, sinSeccion(parametros))
}
