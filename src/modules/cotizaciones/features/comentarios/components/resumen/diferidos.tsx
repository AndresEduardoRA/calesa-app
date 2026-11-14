'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

const Esqueleto = (
  <div aria-busy="true" className="grid gap-2">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
  </div>
)

// Las pestañas llegan recién cuando el resumen de una cotización se abre: el listado de `/cotizaciones` sólo paga esta cáscara. Sin red, el aviso va en el lugar de las pestañas.
export const PestanasDeLaCotizacionDiferido = diferido(
  () => import('./pestanas-de-la-cotizacion').then((modulo) => modulo.PestanasDeLaCotizacion),
  { esqueleto: Esqueleto, aviso: 'aqui' },
)

// Cada pestaña pide su código y sus lecturas al elegirse. Sin red, el aviso va en el lugar de la pestaña.
export const TodoDelResumenDiferido = diferido(
  () => import('./todo-del-resumen').then((modulo) => modulo.TodoDelResumen),
  { esqueleto: Esqueleto, aviso: 'aqui' },
)

export const AdjuntosDelResumenDiferido = diferido(
  () => import('./adjuntos-del-resumen').then((modulo) => modulo.AdjuntosDelResumen),
  { esqueleto: Esqueleto, aviso: 'aqui' },
)

export const RevisionesDelResumenDiferido = diferido(
  () => import('./revisiones-del-resumen').then((modulo) => modulo.RevisionesDelResumen),
  { esqueleto: Esqueleto, aviso: 'aqui' },
)

export const ComentariosDelResumenDiferido = diferido(
  () => import('./comentarios-del-resumen').then((modulo) => modulo.ComentariosDelResumen),
  { esqueleto: Esqueleto, aviso: 'aqui' },
)
