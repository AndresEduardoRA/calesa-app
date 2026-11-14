import { leerOrigenesDeLaCadena, origenElegido, type OrigenDeLaCadena } from '@/modules/logistica'
import type { Permisos } from '@/shared/lib/permisos'

// El origen que dibuja una pantalla de la cadena: el de `?origen=` si la persona lo ve, si no el primero. Un origen pedido que no ve no cae al primero: sería leer otra cosa que lo que dice
// la URL (`sin_permiso`). `error`: no se pudo leer la lista; `sin_origenes`: ninguno tiene la logística encendida.
export type OrigenResuelto =
  | { tipo: 'ok'; origen: OrigenDeLaCadena; origenes: OrigenDeLaCadena[]; fallaron: number }
  | { tipo: 'error' | 'sin_permiso' | 'sin_origenes' }

export async function resolverElOrigen(
  permisos: Permisos,
  pedido: string | undefined,
  { estricto }: { estricto: boolean },
): Promise<OrigenResuelto> {
  const lista = await leerOrigenesDeLaCadena(permisos)
  if (lista === null) return { tipo: 'error' }
  if (estricto && pedido !== undefined && !lista.origenes.some((o) => o.id === pedido)) {
    return { tipo: 'sin_permiso' }
  }
  const origen = origenElegido(lista.origenes, pedido)
  if (origen === null) return { tipo: 'sin_origenes' }
  return { tipo: 'ok', origen, origenes: lista.origenes, fallaron: lista.fallaron }
}
