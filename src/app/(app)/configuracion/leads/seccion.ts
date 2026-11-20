import { ContactRoundIcon } from 'lucide-react'
import type { ClavePermiso } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Leads en el registro, con sus siete sub-rutas. No tiene sub-sección índice: la ruta de la sección sólo
// redirige a la primera que la persona puede abrir (`page.tsx`). «Campos» pide `leads.campos.gestionar`; las otras seis,
// `leads.configurar` (9-3). La que no puedes abrir se ve apagada con su motivo y su URL abre la primera habilitada (`abrir.ts`). El tipo se
// trae con `import type`: el ciclo con `secciones.ts` se borra al compilar.

const MOTIVO_SIN_CONFIGURAR = 'Te falta el permiso «Configurar leads».'

const CON_CONFIGURAR = {
  permisos: ['leads.configurar'],
  motivoSinPermiso: MOTIVO_SIN_CONFIGURAR,
} as const

export const CAMPOS_DE_LEADS = {
  clave: 'campos',
  titulo: 'Campos',
  descripcion: 'Los datos de cada lead, en qué grupo van y quién los ve.',
  palabras: ['datos del lead', 'grupos', 'quién ve', 'privacidad'],
  ruta: RUTAS.camposDeLeads,
  permisos: ['leads.campos.gestionar'],
  motivoSinPermiso: 'Te falta el permiso «Gestionar los campos de los leads».',
} as const satisfies SubseccionDeConfiguracion

export const ORIGENES_DE_LEADS = {
  clave: 'origenes',
  titulo: 'Orígenes del lead',
  descripcion: 'De dónde llegan los leads y cuál se elige por defecto.',
  palabras: ['fuente', 'canal', 'facebook', 'por defecto'],
  ruta: RUTAS.origenesDeLeads,
  ...CON_CONFIGURAR,
} as const satisfies SubseccionDeConfiguracion

export const TIPOS_DE_LEAD = {
  clave: 'tipos',
  titulo: 'Tipos de lead',
  descripcion: 'Qué es cada lead: prospecto o cliente, con sus tipos.',
  palabras: ['prospecto', 'cliente'],
  ruta: RUTAS.tiposDeLead,
  ...CON_CONFIGURAR,
} as const satisfies SubseccionDeConfiguracion

export const TIPOS_DE_SEGUIMIENTO = {
  clave: 'seguimientos',
  titulo: 'Tipos de seguimiento',
  descripcion: 'Cómo se contactó a un lead: llamada, visita, mensaje…',
  palabras: ['llamada', 'visita', 'mensaje', 'contacto'],
  ruta: RUTAS.tiposDeSeguimiento,
  ...CON_CONFIGURAR,
} as const satisfies SubseccionDeConfiguracion

export const PLANTILLA_DEL_EMBUDO = {
  clave: 'embudo',
  titulo: 'Plantilla del embudo',
  descripcion: 'Las etapas con las que nace un embudo nuevo.',
  palabras: ['etapas', 'pipeline', 'fases'],
  ruta: RUTAS.plantillaDelEmbudo,
  ...CON_CONFIGURAR,
} as const satisfies SubseccionDeConfiguracion

export const MENSAJE_DEL_PORTAL = {
  clave: 'portal',
  titulo: 'Mensaje del portal',
  descripcion: 'El mensaje que recibe un cliente con su acceso al portal.',
  palabras: ['whatsapp', 'código', 'clave', 'acceso', 'mensaje', 'enlace'],
  ruta: RUTAS.mensajeDelPortal,
  ...CON_CONFIGURAR,
} as const satisfies SubseccionDeConfiguracion

export const TELEFONOS_EXTRA = {
  clave: 'telefonos',
  titulo: 'Teléfonos extra',
  descripcion: 'Cuántos teléfonos extra tiene un lead y si cuentan como el principal.',
  palabras: ['celular', 'teléfono principal', 'extra'],
  ruta: RUTAS.telefonosExtraDeLeads,
  ...CON_CONFIGURAR,
} as const satisfies SubseccionDeConfiguracion

export const SUBSECCIONES_DE_LEADS = [
  CAMPOS_DE_LEADS,
  ORIGENES_DE_LEADS,
  TIPOS_DE_LEAD,
  TIPOS_DE_SEGUIMIENTO,
  PLANTILLA_DEL_EMBUDO,
  MENSAJE_DEL_PORTAL,
  TELEFONOS_EXTRA,
] as const satisfies readonly SubseccionDeConfiguracion[]

export type ClaveDeSubseccionDeLeads = (typeof SUBSECCIONES_DE_LEADS)[number]['clave']

// Con cualquiera de ellos se entra a Configuración › Leads: la unión de los permisos de sus sub-secciones, sin repetir y en orden.
export const PERMISOS_DE_LEADS: readonly ClavePermiso[] = [
  ...new Set(SUBSECCIONES_DE_LEADS.flatMap((sub): readonly ClavePermiso[] => sub.permisos)),
]

export const SECCION_DE_LEADS = {
  clave: 'leads',
  titulo: 'Leads',
  descripcion: 'Los campos, los orígenes y tipos de lead, los seguimientos, el embudo y el portal.',
  palabras: ['clientes', 'prospectos', 'embudo', 'seguimientos', 'portal', 'teléfonos'],
  ruta: RUTAS.configuracionDeLeads,
  Icono: ContactRoundIcon,
  permisos: PERMISOS_DE_LEADS,
  grupo: 'ventas',
  subsecciones: SUBSECCIONES_DE_LEADS,
} as const satisfies SeccionDeConfiguracion
