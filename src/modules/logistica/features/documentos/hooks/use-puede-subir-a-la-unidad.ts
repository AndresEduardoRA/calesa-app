'use client'

import { puede } from '@/shared/lib/permisos'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { usePermisosDeDocumentos } from './use-permisos-de-documentos'

/** ¿Puede esta persona subir documentos a la unidad? `null` mientras se leen sus permisos; la base vuelve a exigirlo al registrar. */
export function usePuedeSubirALaUnidad(unidad: Unidad): boolean | null {
  const permisos = usePermisosDeDocumentos()
  const clave =
    unidad.tipo === 'vehiculo' ? 'logistica.documentos.subir' : 'repuestos.documentos.subir'
  return permisos === null ? null : puede(permisos, clave, unidad.origenId)
}
