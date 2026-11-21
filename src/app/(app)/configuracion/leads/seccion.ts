import { ContactRoundIcon } from 'lucide-react'
import type { ClavePermiso } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Leads en el registro. La ruta de la sección es una página de seis tarjetas (tipos de lead, orígenes del lead,
// tipos de seguimiento, embudo, mensaje del portal y teléfonos extra: `leads.configurar`) y «Campos», su única sub-ruta, pide
// `leads.campos.gestionar`. Quien sólo gestiona los campos, al abrir la raíz va a «Campos»; la que no puedes abrir se ve apagada con su motivo
// y su URL abre la que sí (`abrir.ts`). El tipo se trae con `import type`: el ciclo con `secciones.ts` se borra al compilar.

export const CAMPOS_DE_LEADS = {
  clave: 'campos',
  titulo: 'Campos',
  descripcion: 'Los datos de cada lead, en qué grupo van y quién los ve.',
  palabras: ['datos del lead', 'grupos', 'quién ve', 'privacidad'],
  ruta: RUTAS.camposDeLeads,
  permisos: ['leads.campos.gestionar'],
  motivoSinPermiso: 'Te falta el permiso «Gestionar los campos de los leads».',
} as const satisfies SubseccionDeConfiguracion

export const SUBSECCIONES_DE_LEADS = [
  CAMPOS_DE_LEADS,
] as const satisfies readonly SubseccionDeConfiguracion[]

// Con cualquiera de los dos se entra a Configuración › Leads: las tarjetas piden `leads.configurar`; «Campos», `leads.campos.gestionar`.
export const PERMISO_DE_LAS_TARJETAS = 'leads.configurar' as const satisfies ClavePermiso
export const PERMISOS_DE_LEADS: readonly ClavePermiso[] = [
  ...CAMPOS_DE_LEADS.permisos,
  PERMISO_DE_LAS_TARJETAS,
]

export const SECCION_DE_LEADS = {
  clave: 'leads',
  titulo: 'Leads',
  descripcion:
    'Los tipos y orígenes del lead, los seguimientos, el embudo, el mensaje del portal y los teléfonos extra.',
  palabras: [
    'clientes',
    'prospectos',
    'embudo',
    'seguimientos',
    'portal',
    'teléfonos',
    'orígenes',
    'fuente',
    'canal',
    'facebook',
    'por defecto',
    'prospecto',
    'cliente',
    'llamada',
    'visita',
    'mensaje',
    'contacto',
    'etapas',
    'pipeline',
    'fases',
    'whatsapp',
    'código',
    'clave',
    'acceso',
    'enlace',
    'celular',
    'teléfono principal',
    'extra',
  ],
  ruta: RUTAS.configuracionDeLeads,
  Icono: ContactRoundIcon,
  permisos: PERMISOS_DE_LEADS,
  grupo: 'ventas',
  subsecciones: SUBSECCIONES_DE_LEADS,
} as const satisfies SeccionDeConfiguracion
