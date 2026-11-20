import 'server-only'
import { requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { puede } from '@/shared/lib/permisos'
import { primeraSubseccionAbierta, type SubseccionDeConfiguracion } from '../secciones'
import { SECCION_DE_CATALOGOS, subseccionDeCatalogos } from './seccion'

// Lo que cada página de Catálogos comprueba antes de dibujarse (un layout no protege a su página): sin ninguno de los permisos de su
// sub-sección, la primera que la persona abre; sin ninguna, «No tienes permiso». Los permisos se miran en algún origen: los catálogos son de la
// empresa. La base vuelve a exigir lo suyo en cada RPC y policy.
export async function abrirCatalogo(clave: string) {
  const sesion = await requerirSesion()
  const sub = subseccionDeCatalogos(clave)
  if (sub === null || !sub.permisos.some((permiso) => puede(sesion.permisos, permiso))) {
    const destino = primeraSubseccionAbierta(SECCION_DE_CATALOGOS, sesion.permisos)
    if (destino === null) {
      return { sinPermiso: true as const }
    }
    redirigir(destino)
  }
  return { sinPermiso: false as const, sesion, sub: sub satisfies SubseccionDeConfiguracion }
}
