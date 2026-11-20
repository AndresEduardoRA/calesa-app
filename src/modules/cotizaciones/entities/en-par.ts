// Qué nodos van en par (glosario: «Variante en par»): con una variante que se cotiza en par, un nodo cambia según la opción si tiene `solo_en` o nombra
// (`referenciasDe()`) la variante o un nodo que ya cambia; los demás son comunes. La variante y los tipos de cambio nunca. Regla estática, sin evaluar: la forma
// de la hoja no cambia al tipear. Una sola pasada en el orden de la lista (un nodo sólo nombra lo anterior). Espejo de `_nodos_en_par()` de la base, con el
// juego `casos-de-en-par.json` (Vitest y `supabase/tests/areas/formula/en-par.sql`). Puro.
import type { Definicion } from './formula'
import { soloEnDe, type Nodo, type NodoOpcion } from './nodos'
import { referenciasDe } from './nodos-referencias'

export const varianteEnPar = (definicion: Pick<Definicion, 'nodos'>): NodoOpcion | undefined =>
  definicion.nodos.find((n): n is NodoOpcion => n.tipo === 'opcion' && n.en_par === true)

// Los ids de los nodos que van en par, en el orden de la lista (un `Set` conserva el orden en que se suman).
export function nodosEnPar(definicion: Pick<Definicion, 'nodos'>): ReadonlySet<string> {
  const variante = varianteEnPar(definicion)
  const marcados = new Set<string>()
  if (variante === undefined) return marcados
  const cambia = (id: string) => id === variante.id || marcados.has(id)
  for (const n of definicion.nodos) {
    if (!puedeIrEnPar(n)) continue
    if (soloEnDe(n) !== undefined || referenciasDe(n).some((r) => cambia(r.id))) marcados.add(n.id)
  }
  return marcados
}

const puedeIrEnPar = (n: Nodo) => n.tipo !== 'opcion' && n.tipo !== 'tipo_cambio'
