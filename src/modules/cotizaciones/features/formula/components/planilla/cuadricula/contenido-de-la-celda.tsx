'use client'

import type { CifraDeLaFila } from '../../../../../entities/formula/vista-previa'
import { formatoDe, type Nodo } from '../../../../../entities/nodos'
import { CeldaDelValor } from '../celda-del-valor'
import { ValorDeConstante } from '../comunes/valor-de-constante'
import type { ValorDeLaUnidad } from './valor-de-la-unidad'

const RAYA = <span className="text-(--color-ink-soft)">—</span>

type PropsDeC = {
  nodo: Nodo
  // El valor fijo (en `params`): nulo sin valor; `undefined` si la fila no es un valor fijo.
  constante: number | null | undefined
  // Lo de la unidad de ejemplo (lo que escribe el asesor, el dato del vehículo, el interruptor o la variante); `undefined` si la fila no es de la unidad.
  unidad: ValorDeLaUnidad | undefined
  cifra: CifraDeLaFila
  leyendo: boolean
}

function DeLaUnidad({ nodo, unidad }: { nodo: Nodo; unidad: ValorDeLaUnidad }) {
  if (nodo.tipo === 'bandera') return <>{unidad === true ? 'Sí' : 'No'}</>
  if (nodo.tipo === 'opcion')
    return <>{nodo.opciones.find((o) => o.clave === unidad)?.etiqueta ?? '—'}</>
  if (typeof unidad === 'number')
    return <ValorDeConstante valor={unidad} formato={formatoDe(nodo)} />
  return unidad === null || unidad === false || unidad === true ? RAYA : <>{unidad}</>
}

// Lo que muestra la C: el valor fijo, lo de la unidad de ejemplo (el asesor, el vehículo, «Sí» o «No», la opción elegida) o la cifra calculada con la unidad.
// El dinero por `<Monto>` (Modo Live).
export function ContenidoDeC(p: PropsDeC) {
  if (p.constante !== undefined)
    return p.constante === null ? (
      RAYA
    ) : (
      <ValorDeConstante valor={p.constante} formato={formatoDe(p.nodo)} />
    )
  if (p.unidad !== undefined) return <DeLaUnidad nodo={p.nodo} unidad={p.unidad} />
  return <CeldaDelValor cifra={p.cifra} leyendo={p.leyendo} />
}

// Lo que muestra la B: el % de la fila (el absorbido, el de otra fila o el escrito en su fórmula), o «—» si todavía no tiene cifra.
export function ContenidoDeB({ valor }: { valor: number | null }) {
  return valor === null ? RAYA : <ValorDeConstante valor={valor} formato="pct" />
}
