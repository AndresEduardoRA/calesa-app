import { CalculatorIcon } from 'lucide-react'
import { PESTANAS_DE_COTIZACION, RUTAS, type PestanaDeCotizacion } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Cotización en el registro. Vive en su carpeta. El inicio (`/configuracion/cotizacion`) muestra una tarjeta por
// origen y una «General»; debajo, dos grupos de sub-secciones:
// - «Por origen» (Fórmula, Hoja, Tarjeta, Tablas): plantillas `/configuracion/cotizacion/[origen]/<pestana>` con `cotizaciones.configurar`; el
//   menú las rellena con el origen abierto y, sin origen en la URL, usa su `respaldo` (la URL vieja `?seccion=`, que redirige al primero).
// - «General» (Colores, Niveles, Vigencia): rutas fijas. Niveles se abre con los permisos de la matriz de Roles (cada nivel es un permiso) y,
//   para quien configura sin ver los roles, va apagada con su motivo.
// Es la única fuente de títulos, frases, rutas y permisos: las pestañas de las páginas salen de aquí. El tipo se trae con `import type`: el
// ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.

export type ParteDelOrigen = SubseccionDeConfiguracion & { clave: PestanaDeCotizacion }

const CLAVE_VIEJA: Record<PestanaDeCotizacion, string> = {
  formula: 'formula',
  hoja: 'diseno',
  tarjeta: 'tarjeta',
  tablas: 'tablas',
}

const DEL_ORIGEN: Record<PestanaDeCotizacion, { titulo: string; descripcion: string }> = {
  formula: { titulo: 'Fórmula', descripcion: 'Qué se calcula.' },
  hoja: { titulo: 'Hoja', descripcion: 'Cómo se ve y se llena la cotización.' },
  tarjeta: { titulo: 'Tarjeta', descripcion: 'La imagen que recibe el cliente.' },
  tablas: { titulo: 'Tablas', descripcion: 'Valores de referencia: depreciación, transporte…' },
}

export const PARTES_DEL_ORIGEN: readonly ParteDelOrigen[] = PESTANAS_DE_COTIZACION.map((clave) => ({
  clave,
  ...DEL_ORIGEN[clave],
  ruta: `${RUTAS.configuracionDeCotizacion}/[origen]/${clave}`,
  permisos: ['cotizaciones.configurar'],
  grupo: 'Por origen',
  respaldo: `${RUTAS.configuracionDeCotizacion}?seccion=${CLAVE_VIEJA[clave]}`,
}))

export const CLAVES_GENERALES = ['colores', 'niveles', 'vigencia'] as const

export type ClaveGeneral = (typeof CLAVES_GENERALES)[number]

export type ParteGeneral = SubseccionDeConfiguracion & { clave: ClaveGeneral }

export const MOTIVO_SIN_VER_ROLES = 'Te falta el permiso «Ver roles».'

export const PARTES_GENERALES = [
  {
    clave: 'colores',
    titulo: 'Colores',
    descripcion: 'Los colores de la hoja y de la tarjeta, para toda la empresa.',
    ruta: RUTAS.coloresDeCotizacion,
    permisos: ['cotizaciones.configurar'],
    grupo: 'General',
  },
  {
    clave: 'niveles',
    titulo: 'Niveles',
    descripcion: 'Quién ve y edita qué celdas.',
    ruta: RUTAS.nivelesDeCotizacion,
    permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
    motivoSinPermiso: MOTIVO_SIN_VER_ROLES,
    grupo: 'General',
  },
  {
    clave: 'vigencia',
    titulo: 'Vigencia',
    descripcion: 'Cuántos días vale una cotización.',
    ruta: RUTAS.vigenciaDeCotizacion,
    permisos: ['cotizaciones.configurar'],
    grupo: 'General',
  },
] as const satisfies readonly ParteGeneral[]

export function parteDelOrigen(clave: PestanaDeCotizacion): ParteDelOrigen {
  const parte = PARTES_DEL_ORIGEN.find((una) => una.clave === clave)
  if (!parte) {
    throw new Error(`Pestaña de cotización desconocida: ${clave}`)
  }
  return parte
}

export function parteGeneral(clave: ClaveGeneral): ParteGeneral {
  const parte = PARTES_GENERALES.find((una: ParteGeneral) => una.clave === clave)
  if (!parte) {
    throw new Error(`Parte general de cotización desconocida: ${clave}`)
  }
  return parte
}

export const SECCION_DE_COTIZACION = {
  clave: 'cotizacion',
  titulo: 'Cotización',
  descripcion:
    'La fórmula, la hoja, la tarjeta y las tablas de cada origen, y los colores, los niveles y la vigencia.',
  ruta: RUTAS.configuracionDeCotizacion,
  Icono: CalculatorIcon,
  permisos: ['equipo.roles.ver', 'equipo.roles.gestionar', 'cotizaciones.configurar'],
  grupo: 'ventas',
  subsecciones: [...PARTES_DEL_ORIGEN, ...PARTES_GENERALES],
} as const satisfies SeccionDeConfiguracion
