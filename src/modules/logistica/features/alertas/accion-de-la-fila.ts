import { puede, type Permisos } from '@/shared/lib/permisos'
import { puedeResolverLaSubasta } from '@/modules/vehiculos'
import { rutaDeLaUnidad } from '../../entities/nucleo/enlaces'
import type { FilaDeLaBandeja } from '../../entities/alertas/grupo-leido'

// Lo que ofrece cada fila de la bandeja del día (su acción principal a un toque). Vive en `features` porque pregunta por `puedeResolverLaSubasta` de `vehiculos`: una entidad no importa otro módulo.

const CLAVE_DE_GANADA = 'ganada'

export type AccionDeLaFila =
  | { tipo: 'enlace'; texto: string; href: string }
  // «La ganamos» lleva a la página del vehículo en su modo de «ganada»; «No la ganamos» se hace en la fila (con «Deshacer»).
  | { tipo: 'resolver'; hrefDeLaGanamos: string; origenId: string; vehiculoId: string }

const puedeMover = (permisos: Permisos, origenId: string) =>
  puede(permisos, 'flujos.mover', origenId) || puede(permisos, 'flujos.mover.cualquiera', origenId)

/**
 * La acción principal de la fila, a un toque, sólo si quien mira la puede hacer (sin el permiso la fila conserva el enlace al detalle, que es el nombre). «Aprobar» no aprueba en la fila: se
 * aprueba mirando el archivo, así que «Revisar» lleva al documento abierto. La base vuelve a decidir al hacerla.
 */
export function accionDeLaFila(fila: FilaDeLaBandeja, permisos: Permisos): AccionDeLaFila | null {
  switch (fila.grupo) {
    case 'demorados':
    case 'llegadas':
    case 'salidas':
      return puedeMover(permisos, fila.origenId)
        ? { tipo: 'enlace', texto: 'Mover', href: rutaDeLaUnidad(fila.vehiculoId) }
        : null
    case 'trabados':
      return { tipo: 'enlace', texto: 'Ver qué falta', href: rutaDeLaUnidad(fila.vehiculoId) }
    case 'por_aprobar':
      return puede(permisos, 'logistica.documentos.aprobar', fila.origenId)
        ? { tipo: 'enlace', texto: 'Revisar', href: rutaDeLaUnidad(fila.vehiculoId, 'documentos') }
        : null
    case 'por_vencer':
      return puede(permisos, 'logistica.documentos.subir', fila.origenId)
        ? { tipo: 'enlace', texto: 'Renovar', href: rutaDeLaUnidad(fila.vehiculoId, 'documentos') }
        : null
    case 'sin_resolver':
      return puedeResolverLaSubasta(permisos, fila.origenId)
        ? {
            tipo: 'resolver',
            hrefDeLaGanamos: `${rutaDeLaUnidad(fila.vehiculoId)}?${CLAVE_DE_GANADA}=si`,
            origenId: fila.origenId,
            vehiculoId: fila.vehiculoId,
          }
        : null
  }
}
