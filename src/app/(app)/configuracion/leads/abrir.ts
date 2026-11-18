import { puede, requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { primeraSubseccionAbierta } from '../secciones'
import {
  PERMISOS_DE_LEADS,
  SECCION_DE_LEADS,
  SUBSECCIONES_DE_LEADS,
  type ClaveDeSubseccionDeLeads,
} from './seccion'

// Lo que hace cada sub-ruta de Configuración › Leads antes de dibujar: sin ninguno de los permisos de la sección, «sin permiso»; sin el de
// esta sub-sección (se ve apagada en el menú), a la primera que sí abre. Nunca redirige a la raíz de la sección (que vuelve a redirigir):
// si no hubiera adónde ir, «sin permiso». Corta con `redirigir()`: quien la llama no la pone dentro de un `try`.
export async function abrirSubseccionDeLeads(
  clave: ClaveDeSubseccionDeLeads,
): Promise<{ sinPermiso: boolean }> {
  const { permisos } = await requerirSesion()
  if (!PERMISOS_DE_LEADS.some((permiso) => puede(permisos, permiso))) {
    return { sinPermiso: true }
  }
  const sub = SUBSECCIONES_DE_LEADS.find((una) => una.clave === clave)
  if (sub === undefined || !sub.permisos.some((permiso) => puede(permisos, permiso))) {
    const destino = primeraSubseccionAbierta(SECCION_DE_LEADS, permisos)
    if (destino === null) {
      return { sinPermiso: true }
    }
    redirigir(destino)
  }
  return { sinPermiso: false }
}
