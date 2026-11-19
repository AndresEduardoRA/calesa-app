import 'server-only'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { redirigir } from '@/shared/lib/navegacion'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { accesoDeCotizacion, primeraDeCotizacion, puedeVerNiveles } from '../acceso'
import { PARTES_GENERALES, type ClaveGeneral, type ParteGeneral } from '../seccion'

type PestanaGeneral = { clave: ClaveGeneral; titulo: string; ruta: string; motivo?: string }

// Las pestañas de General que la persona ve: las que abre y, apagada con su motivo, la que no abre y lo declara (Niveles, para quien configura
// sin ver los roles). Las mismas reglas que el menú (`conSubseccionesVisibles`).
export function pestanasGenerales(permisos: Permisos): PestanaGeneral[] {
  return PARTES_GENERALES.flatMap((parte: ParteGeneral): PestanaGeneral[] => {
    const base = { clave: parte.clave, titulo: parte.titulo, ruta: parte.ruta }
    if (parte.permisos.some((clave: ClavePermiso) => puede(permisos, clave))) {
      return [base]
    }
    return parte.motivoSinPermiso === undefined ? [] : [{ ...base, motivo: parte.motivoSinPermiso }]
  })
}

const abre = (clave: ClaveGeneral, permisos: Permisos) =>
  clave === 'niveles' ? puedeVerNiveles(permisos) : puede(permisos, 'cotizaciones.configurar')

// Lo que cada página de General comprueba antes de dibujarse (un layout no protege a su página): sin su permiso, la primera parte que la
// persona abre (`primeraDeCotizacion`); sin ninguna, «No tienes permiso».
export async function abrirGeneral(clave: ClaveGeneral) {
  const sesion = await requerirSesion()
  if (!abre(clave, sesion.permisos)) {
    const acceso = accesoDeCotizacion(sesion.permisos, datosO(await getOrigenes(true)))
    const destino = primeraDeCotizacion(acceso)
    if (destino === null) {
      return { sinPermiso: true as const }
    }
    redirigir(destino)
  }
  return { sinPermiso: false as const, sesion, pestanas: pestanasGenerales(sesion.permisos) }
}
