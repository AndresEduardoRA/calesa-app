import { puede, type Permisos } from '@/shared/lib/permisos'
import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { primeraSubseccionAbierta, type SubseccionDeConfiguracion } from '../secciones'
import { PERMISOS_DE_WEB, SECCION_DE_WEB } from './seccion'

// Qué hace una sub-ruta de Sitio web con quien llega: sin ninguno de los permisos de la sección, «No tienes permiso»; con alguno pero sin el
// de esta sub-sección (que el menú le muestra apagada), su URL lo lleva a la primera que sí puede abrir. La base vuelve a exigir la clave en
// cada lectura y escritura.
export function entrarASubseccion(
  permisos: Permisos,
  subseccion: SubseccionDeConfiguracion,
): 'sin-permiso' | 'abierta' {
  if (!PERMISOS_DE_WEB.some((clave) => puede(permisos, clave))) {
    return 'sin-permiso'
  }
  if (!subseccion.permisos.some((clave) => puede(permisos, clave))) {
    redirigir(primeraSubseccionAbierta(SECCION_DE_WEB, permisos) ?? RUTAS.configuracion)
  }
  return 'abierta'
}
