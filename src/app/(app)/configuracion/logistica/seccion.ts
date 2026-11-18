import { TruckIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'
import { CATALOGOS_DE_LOGISTICA } from './catalogos'

// La entrada de Configuración › Logística en el registro, con una sub-ruta por catálogo (`/configuracion/logistica/<clave>`). Sólo existe
// cuando algún área llena un catálogo (`catalogos.ts`): hasta entonces la lista queda vacía y el menú no cambia (no hay renglón que lleve a
// una pantalla sin nada). Se abre con la clave de gestionar los catálogos; cada sub-sección, con el permiso de su catálogo. La sección no
// tiene índice: su ruta abre la primera sub-sección que la persona puede abrir. El tipo se trae con `import type`: el ciclo con
// `secciones.ts` es sólo de tipos y se borra al compilar.
export const SUBSECCIONES_DE_LOGISTICA: readonly SubseccionDeConfiguracion[] = [
  ...new Map(CATALOGOS_DE_LOGISTICA.map((catalogo) => [catalogo.clave, catalogo])).values(),
].map((catalogo) => ({
  clave: catalogo.clave,
  titulo: catalogo.titulo,
  descripcion: catalogo.descripcion,
  ruta: `${RUTAS.configuracionDeLogistica}/${catalogo.clave}`,
  permisos: [catalogo.permiso],
}))

export const SECCION_DE_LOGISTICA: SeccionDeConfiguracion = {
  clave: 'logistica',
  titulo: 'Logística',
  descripcion: 'Los catálogos del transporte y de los gastos: puertos, navieras y categorías.',
  ruta: RUTAS.configuracionDeLogistica,
  Icono: TruckIcon,
  permisos: ['logistica.catalogos.gestionar'],
  grupo: 'operacion',
  subsecciones: SUBSECCIONES_DE_LOGISTICA,
}

export const SECCIONES_DE_LOGISTICA: readonly SeccionDeConfiguracion[] =
  CATALOGOS_DE_LOGISTICA.length > 0 ? [SECCION_DE_LOGISTICA] : []
