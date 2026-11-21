import { puede, requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { CAMPOS_DE_LEADS, PERMISO_DE_LAS_TARJETAS, PERMISOS_DE_LEADS } from './seccion'

// Lo que hace «Campos» antes de dibujar: sin ninguno de los permisos de la sección, «sin permiso»; sin el suyo (se ve apagada en el menú), a las
// tarjetas, que sí abre quien tiene `leads.configurar`. Corta con `redirigir()`: quien la llama no la pone dentro de un `try`.
export async function abrirCamposDeLeads(): Promise<{ sinPermiso: boolean }> {
  const { permisos } = await requerirSesion()
  if (!PERMISOS_DE_LEADS.some((permiso) => puede(permisos, permiso))) {
    return { sinPermiso: true }
  }
  if (!CAMPOS_DE_LEADS.permisos.some((permiso) => puede(permisos, permiso))) {
    if (puede(permisos, PERMISO_DE_LAS_TARJETAS)) {
      redirigir(RUTAS.configuracionDeLeads)
    }
    return { sinPermiso: true }
  }
  return { sinPermiso: false }
}
