import 'server-only'
import { puede, type Permisos } from '@/modules/equipo'
import { rutaDeLaUnidad } from '@/modules/logistica'
import { proyectoDe, rutaDelProyecto } from '@/modules/repuestos'
import { CLAVE_DE_FICHA_COMPLETA, FICHA_COMPLETA } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { redirigir } from '@/shared/lib/navegacion'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import {
  destinoConPermisos,
  destinoSinLeer,
  seccionConPermisos,
  type DestinosConPermisos,
  type SeccionConPermisos,
} from './secciones-viejas'

type Parametros = Awaited<PageProps<'/vehiculos/[id]'>['searchParams']>

// La llegada a la ficha del vehículo por un enlace viejo a un bloque que se fue (`secciones-viejas.ts`). Cada redirección reemplaza la entrada del
// historial y corta la página (`redirigir()`: nunca dentro de un `try`).

/** `?seccion=fotos|ficha`: antes de leer el vehículo, al visor o a la ficha completa de la misma ficha. */
export function redirigirSinLeer(vehiculoId: string, parametros: Parametros): void {
  const destino = destinoSinLeer(vehiculoId, parametros, {
    clave: CLAVE_DE_FICHA_COMPLETA,
    valor: FICHA_COMPLETA,
  })
  if (destino !== null) {
    redirigir(destino)
  }
}

// Las rutas de otros módulos con el permiso de quien mira. El proyecto de repuestos se lee sólo para `?seccion=repuestos` y con `repuestos.ver`
// (`proyectoDe`, con `cache()`: la misma fila que el enlace corto de la cabecera, por `repuestos_proyecto_por_vehiculo`).
async function destinosDe(
  seccion: SeccionConPermisos,
  vehiculoId: string,
  origenId: string,
  permisos: Permisos,
): Promise<DestinosConPermisos> {
  const logistica = puede(permisos, 'logistica.ver', origenId)
    ? {
        unidad: unidadDeLogistica(vehiculoId),
        documentos: rutaDeLaUnidad(vehiculoId, 'documentos'),
      }
    : null
  if (seccion !== 'repuestos' || !puede(permisos, 'repuestos.ver')) {
    return { logistica, proyecto: null }
  }
  const proyecto = datosO(await proyectoDe(vehiculoId))
  return { logistica, proyecto: proyecto === null ? null : rutaDelProyecto(proyecto.id) }
}

/**
 * `?seccion=documentos|fase|repuestos`, ya con el vehículo visto: a su página si quien mira la ve (`logistica.ver` del origen; `repuestos.ver` y un
 * proyecto). Si no, nada: la ficha se queda arriba.
 */
export async function redirigirConPermisos(
  vehiculoId: string,
  origenId: string,
  permisos: Permisos,
  parametros: Parametros,
): Promise<void> {
  const seccion = seccionConPermisos(parametros)
  if (seccion === null) {
    return
  }
  const destino = destinoConPermisos(
    seccion,
    await destinosDe(seccion, vehiculoId, origenId, permisos),
  )
  if (destino !== null) {
    redirigir(destino)
  }
}
