'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { unidadDeLogistica } from '@/shared/lib/rutas'

// Abre la página de un vehículo desde la fila de una lista (un clic fuera del nombre): `/logistica/vehiculo/<id>`. Sin drawer y sin conservar nada de la URL de la lista.
export function useIrALaUnidad() {
  const router = useRouter()
  return (id: string) => {
    router.push(unidadDeLogistica(id) as Route)
  }
}
