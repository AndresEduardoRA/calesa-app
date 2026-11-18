import { RUTAS } from '@/shared/lib/rutas'
import type { SubseccionDeConfiguracion } from '../secciones'
import { PERMISOS_DE_ORIGENES } from './acceso'

// Las partes de un origen: cada una es una sub-ruta de `/configuracion/origenes/<id>` y entra al menú de Configuración como plantilla
// (`[id]`), que el menú y el selector rellenan con el origen que se ve (`rutaResuelta()`). En la lista de orígenes no aparecen. El tipo se
// trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos.
export const CLAVES_DE_PARTE_DEL_ORIGEN = ['datos', 'campos', 'categorias'] as const

export type ParteDelOrigen = (typeof CLAVES_DE_PARTE_DEL_ORIGEN)[number]

export type SubseccionDeOrigen = SubseccionDeConfiguracion & {
  clave: ParteDelOrigen
  // Una frase: qué se configura ahí. La página la dice debajo del nombre del origen.
  descripcion: string
}

export const SUBSECCIONES_DE_ORIGEN = [
  {
    clave: 'datos',
    titulo: 'Datos',
    descripcion: 'El nombre, el tipo y cómo se nombra un vehículo de este origen.',
    ruta: `${RUTAS.origenes}/[id]/datos`,
    permisos: PERMISOS_DE_ORIGENES,
  },
  {
    clave: 'campos',
    titulo: 'Campos',
    descripcion: 'Los datos que se cargan de cada vehículo y los 4 que su ficha muestra primero.',
    ruta: `${RUTAS.origenes}/[id]/campos`,
    permisos: PERMISOS_DE_ORIGENES,
  },
  {
    clave: 'categorias',
    titulo: 'Categorías',
    descripcion: 'Las categorías y subcategorías de los vehículos de este origen.',
    ruta: `${RUTAS.origenes}/[id]/categorias`,
    permisos: PERMISOS_DE_ORIGENES,
  },
] as const satisfies readonly SubseccionDeOrigen[]

export function subseccionDeOrigen(clave: ParteDelOrigen): SubseccionDeOrigen {
  const encontrada = SUBSECCIONES_DE_ORIGEN.find((sub) => sub.clave === clave)
  if (!encontrada) {
    throw new Error(`Parte del origen desconocida: ${clave}`)
  }
  return encontrada
}

// La ruta de una parte de un origen (`/configuracion/origenes/<id>/campos`).
export function rutaDeSubseccionDeOrigen(clave: ParteDelOrigen, id: string): string {
  return subseccionDeOrigen(clave).ruta.replace('[id]', id)
}
