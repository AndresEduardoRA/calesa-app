// Lo que la tarjeta en vivo de la planilla de la fórmula dibuja con la unidad de ejemplo (`CalculoDeLaTarjeta`, el hueco de `entities/tarjeta-en-vivo.ts`): sólo los
// valores y estados de los nodos que la lectura de la tarjeta nombra (nunca uno que la tarjeta no muestra), y los totales del motor. Sin cifra (la fórmula no valida,
// el motor no calcula o el terreno no llegó): las filas de la lectura a la vista, sin valores ni totales. Puro.
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { LecturaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import type { Estado } from '../motor-contexto'
import type { VistaPrevia } from './vista-previa'

// Los ids cuyo valor dibuja la tarjeta: sus nodos (y el `pct` que muestran), los tipos de cambio de cada bucket, la variante y el total.
export function idsDeLaLectura(lectura: LecturaEnCuadricula): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const n of lectura.nodos) {
    ids.add(n.id)
    if (n.pct !== null) ids.add(n.pct)
  }
  for (const tc of [...lectura.tiposDeCambio.buckets, ...lectura.tiposDeCambio.modos]) {
    if (tc.nodo !== null) ids.add(tc.nodo)
  }
  if (lectura.variante !== null) ids.add(lectura.variante.nodo)
  if (lectura.total.nodo !== null) ids.add(lectura.total.nodo)
  return ids
}

export function calculoDeLaUnidad(
  vista: VistaPrevia | null,
  lectura: LecturaEnCuadricula,
  modoTc: string | null,
  verTotalBs: boolean,
): CalculoDeLaTarjeta {
  if (vista?.tipo !== 'calculada') {
    return {
      valores: new Map(),
      estados: new Map(lectura.nodos.map((n): [string, Estado] => [n.id, 'activo'])),
      totales: { usd: null, bs: null },
      modoTc,
      verTotalBs,
    }
  }
  const valores = new Map<string, number | string | null>()
  for (const id of idsDeLaLectura(lectura)) {
    const v = vista.valores.get(id)
    if (v !== undefined) valores.set(id, v)
  }
  // Un nodo que la fórmula de trabajo ya no tiene queda sin estado: la geometría no dibuja su fila (está fuera de la versión).
  const estados = new Map<string, Estado>()
  for (const n of lectura.nodos) {
    const e = vista.estados.get(n.id)
    if (e !== undefined) estados.set(n.id, e)
  }
  return {
    valores,
    estados,
    totales: { usd: vista.totales.usd, bs: vista.totales.bs },
    modoTc,
    verTotalBs,
  }
}
