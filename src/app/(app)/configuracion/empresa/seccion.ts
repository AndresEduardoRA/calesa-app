import { Building2Icon } from 'lucide-react'
import type { ClavePermiso } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'
import { SUBSECCION_DE_COMPROBANTES } from './comprobantes/subseccion'

// La entrada de Configuración › Empresa en el registro, con sus sub-rutas. Vive en su carpeta, como la de Cotización; el área de
// comprobantes suma la suya desde su carpeta. El tipo se trae con `import type`: el ciclo con `secciones.ts` se borra al compilar.

// Entra a Empresa quien tiene alguno de estos dos, y con cualquiera abre Datos, Monedas e Integraciones (cada parte se edita con el
// suyo: sin él, se ve deshabilitada con el motivo).
export const PERMISOS_DE_LA_EMPRESA = [
  'empresa.ajustes.gestionar',
  'empresa.tipos_cambio.gestionar',
] as const satisfies readonly ClavePermiso[]

// La índice: vive en la ruta de la sección.
export const DATOS_DE_LA_EMPRESA = {
  clave: 'datos',
  titulo: 'Datos de la empresa',
  descripcion: 'La marca, los datos legales, la región y las políticas de la empresa.',
  palabras: [
    'logo',
    'colores',
    'nombre',
    'marca',
    'nit',
    'dirección',
    'región',
    'políticas',
    'legal',
  ],
  ruta: RUTAS.empresa,
  permisos: PERMISOS_DE_LA_EMPRESA,
} as const satisfies SubseccionDeConfiguracion

export const MONEDAS_DE_LA_EMPRESA = {
  clave: 'monedas',
  titulo: 'Monedas y tipos de cambio',
  descripcion:
    'Las monedas, los tipos de cambio con su historial y los que se ven en la barra superior.',
  palabras: ['dólar', 'boliviano', 'cambio', 'cotización del dólar', 'barra superior'],
  ruta: RUTAS.monedasDeEmpresa,
  permisos: PERMISOS_DE_LA_EMPRESA,
} as const satisfies SubseccionDeConfiguracion

export const INTEGRACIONES_DE_LA_EMPRESA = {
  clave: 'integraciones',
  titulo: 'Integraciones',
  descripcion: 'Los servicios externos que usa el sistema, como apibara.',
  palabras: ['apibara', 'api', 'servicios', 'conexión'],
  ruta: RUTAS.integracionesDeEmpresa,
  permisos: PERMISOS_DE_LA_EMPRESA,
} as const satisfies SubseccionDeConfiguracion

export const SUBSECCIONES_DE_EMPRESA: readonly SubseccionDeConfiguracion[] = [
  DATOS_DE_LA_EMPRESA,
  MONEDAS_DE_LA_EMPRESA,
  INTEGRACIONES_DE_LA_EMPRESA,
  SUBSECCION_DE_COMPROBANTES,
]

// Con cualquiera de ellos se entra a Empresa: la unión de los permisos de sus sub-secciones, sin repetir y en orden.
export const PERMISOS_DE_EMPRESA: readonly ClavePermiso[] = [
  ...new Set(SUBSECCIONES_DE_EMPRESA.flatMap((sub) => sub.permisos)),
]

export const SECCION_DE_EMPRESA = {
  clave: 'empresa',
  titulo: 'Empresa',
  descripcion: 'La marca, los datos legales, la región, las monedas y las integraciones.',
  palabras: [
    'logo',
    'colores',
    'nombre',
    'marca',
    'nit',
    'dirección',
    'región',
    'moneda',
    'tipo de cambio',
    'integraciones',
  ],
  ruta: RUTAS.empresa,
  Icono: Building2Icon,
  permisos: PERMISOS_DE_EMPRESA,
  grupo: 'empresa-y-equipo',
  subsecciones: SUBSECCIONES_DE_EMPRESA,
} as const satisfies SeccionDeConfiguracion
