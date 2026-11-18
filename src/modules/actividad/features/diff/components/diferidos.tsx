'use client'

import { Skeleton } from '@/shared/ui/skeleton'
import { diferido } from '@/shared/ui/diferido'

// El detalle de un cambio llega recién al desplegarse: la lista de la actividad no carga su lectura ni su presentación para mostrar sus frases.
// Sin red, «Sin conexión» con «Reintentar» ahí mismo, en la fila.
export const DetalleDelCambioDiferido = diferido(
  () => import('./detalle-del-cambio').then((modulo) => modulo.DetalleDelCambio),
  { aviso: 'aqui', esqueleto: <Skeleton className="h-4 w-1/2" /> },
)
