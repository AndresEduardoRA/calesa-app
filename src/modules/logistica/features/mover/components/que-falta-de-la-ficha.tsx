'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { useParaMover } from '../hooks/use-para-mover'
import { CuerpoDeQueFaltaDeLaFicha } from './cuerpo-de-que-falta-de-la-ficha'

// «Qué falta» en la ficha del vehículo, de sólo lectura: lo que pide cada destino posible con las acciones que lo destraban, sin el formulario de mover (mover
// es de logística: «Ver en logística», al lado del título del bloque). Lee y relee como el hueco de la unidad (`useParaMover`): al montarse, al cambiar la
// fase, al volver el foco y cuando otro hueco avisa que cambió algo.
export function QueFaltaDeLaFicha({ unidad }: { unidad: UnidadAbierta }) {
  const { lectura, actualizando, reintentar, releer } = useParaMover(unidad)
  if (lectura.tipo === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando lo que falta" className="grid gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }
  if (lectura.tipo === 'error') {
    return (
      <div className="grid gap-2">
        <Aviso tono={lectura.error.codigo === 'sin_permiso' ? 'info' : 'peligro'}>
          <p>{lectura.error.mensaje}</p>
        </Aviso>
        {lectura.error.codigo === 'sin_permiso' ? null : (
          <div>
            <Button variant="outline" onClick={reintentar}>
              Reintentar
            </Button>
          </div>
        )}
      </div>
    )
  }
  return (
    <CuerpoDeQueFaltaDeLaFicha
      unidad={unidad}
      dato={lectura.dato}
      actualizando={actualizando}
      releer={releer}
    />
  )
}
