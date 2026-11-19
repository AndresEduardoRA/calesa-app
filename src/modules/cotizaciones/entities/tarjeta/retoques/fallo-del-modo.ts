// Lo que el modo «Retocar» dice cuando «Listo» o «Volver a la plantilla» no entran: la regla junto a su celda o su fila, el PT409 con quién y cuándo (y
// «Recargar»), lo que ya no se puede retocar (y «Recargar») o «No se pudo guardar.» con «Reintentar» (sin red o un fallo inesperado). Puro.
import type { ErrorApp } from '@/shared/lib/errores'

export const NO_SE_GUARDO = 'No se pudo guardar.'

export type FalloDelModo =
  | { tipo: 'regla'; mensaje: string; donde: DondeDelModo | null }
  | { tipo: 'conflicto'; mensaje: string }
  | { tipo: 'sin_permiso'; mensaje: string }
  | { tipo: 'sin_guardar'; mensaje: string }

export type DondeDelModo = { tipo: 'celda' | 'fila'; id: string }

// `celdas.<id>` → la celda; `filas_ocultas.<id>` → la fila; lo demás (`retoques`, `filas_ocultas[2]`), en los avisos del modo.
export function dondeDelModo(donde: string | undefined): DondeDelModo | null {
  if (donde === undefined) return null
  const celda = /^celdas\.(.+)$/.exec(donde)?.[1]
  if (celda !== undefined) return { tipo: 'celda', id: celda }
  const fila = /^filas_ocultas\.(.+)$/.exec(donde)?.[1]
  return fila === undefined ? null : { tipo: 'fila', id: fila }
}

export function falloDelModo(error: ErrorApp, sinRed: boolean): FalloDelModo {
  if (sinRed || error.codigo === 'inesperado') return { tipo: 'sin_guardar', mensaje: NO_SE_GUARDO }
  if (error.codigo === 'conflicto') return { tipo: 'conflicto', mensaje: error.mensaje }
  if (error.codigo === 'sin_permiso' || error.codigo === 'no_autenticado') {
    return { tipo: 'sin_permiso', mensaje: error.mensaje }
  }
  return { tipo: 'regla', mensaje: error.mensaje, donde: dondeDelModo(error.causa) }
}
