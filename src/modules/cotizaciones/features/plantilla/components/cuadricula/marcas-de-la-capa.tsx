'use client'

import type { Caja } from '../../../../entities/plantilla/edicion/disposicion'

const estiloDe = (c: Caja) => ({ left: c.x, top: c.y, width: c.ancho, height: c.alto })

// Lo que la capa marca encima de la grilla, sin recibir el puntero: el rango elegido y, con el foco en la grilla, el cursor (foco visible).
export function MarcasDeLaCapa({ rango, cursor }: { rango: Caja | null; cursor: Caja | null }) {
  return (
    <>
      {rango === null ? null : (
        <div
          aria-hidden
          data-seleccion-del-lienzo=""
          className="pointer-events-none absolute border-2 border-(--color-primario) bg-(--color-primario)/10"
          style={estiloDe(rango)}
        />
      )}
      {cursor === null ? null : (
        <div
          aria-hidden
          data-cursor-del-lienzo=""
          className="pointer-events-none absolute shadow-(--shadow-focus)"
          style={estiloDe(cursor)}
        />
      )}
    </>
  )
}
