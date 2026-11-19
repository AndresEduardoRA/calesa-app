import { puede, type Permisos } from '@/shared/lib/permisos'
import {
  RUTAS,
  rutaDeConfiguracionDeCotizacion,
  type PestanaDeCotizacion,
} from '@/shared/lib/rutas'

// Lo que una persona abre de Configuración › Cotización: los orígenes donde tiene `cotizaciones.configurar` (sus ids, en el orden del
// catálogo), si configura en alguno (Colores y Vigencia) y si ve los niveles (los permisos de la matriz de Roles). La base vuelve a exigir lo
// suyo en cada RPC y policy: esto sólo decide qué se dibuja y adónde se redirige.
export type AccesoDeCotizacion = {
  origenes: readonly string[]
  configura: boolean
  veNiveles: boolean
}

export function accesoDeCotizacion(
  permisos: Permisos,
  catalogo: readonly { id: string }[],
): AccesoDeCotizacion {
  return {
    origenes: catalogo
      .filter((origen) => puede(permisos, 'cotizaciones.configurar', origen.id))
      .map((origen) => origen.id),
    configura: puede(permisos, 'cotizaciones.configurar'),
    veNiveles: puedeVerNiveles(permisos),
  }
}

export function puedeVerNiveles(permisos: Permisos): boolean {
  return puede(permisos, 'equipo.roles.ver') || puede(permisos, 'equipo.roles.gestionar')
}

// Adónde va una URL que la persona no puede abrir: la pestaña pedida (o «Fórmula») del primer origen que configura; sin ninguno, Colores;
// sin configurar, Niveles; sin nada, null («No tienes permiso»).
export function primeraDeCotizacion(
  acceso: AccesoDeCotizacion,
  pestana?: PestanaDeCotizacion,
): string | null {
  const [primero] = acceso.origenes
  if (primero !== undefined) {
    return rutaDeConfiguracionDeCotizacion(primero, pestana ?? 'formula')
  }
  if (acceso.configura) {
    return RUTAS.coloresDeCotizacion
  }
  return acceso.veNiveles ? RUTAS.nivelesDeCotizacion : null
}
