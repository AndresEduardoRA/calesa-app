import type { GrupoPorPaso } from '../../../entities/items/grupos-por-paso'

export const AYUDA_DEL_GRUPO = 'Paso: en qué fase del flujo están estos ítems'

// Lo que dice el encabezado de un grupo por paso, el mismo en la tabla (dentro de su `<th scope="rowgroup">`) y en las tarjetas (su `<h2>`): el punto con el color de
// la fase (el de la base: ningún color fijo) y «Comprar · 3». El texto lleva el significado, nunca sólo el color.
export function EncabezadoDelGrupo({ grupo }: { grupo: GrupoPorPaso }) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full border border-(--color-line-strong)"
        style={grupo.fase ? { backgroundColor: grupo.fase.color } : undefined}
      />
      <span className="[overflow-wrap:anywhere]">{grupo.texto}</span>
    </span>
  )
}
