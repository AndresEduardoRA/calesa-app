'use client'

import { useContext, useMemo } from 'react'
import { valorDeSubtotal } from '../../../../entities/binding'
import type { CeldaDeHoja as Celda, SubtotalDeHoja as Subtotal } from '../../../../entities/hoja'
import { rotuloEnPar } from '../../../../entities/hoja-en-par'
import type { AccionesDeHoja } from '../../hooks/use-hoja'
import { CeldaDeHoja } from '../celda-de-hoja'
import { claseDelItem } from '../clases-de-la-rejilla'
import { SubtotalDeHoja } from '../subtotal-de-hoja'
import { ContextoDelPar, type ColumnaDelPar } from './contexto-del-par'

type Props = { item: Celda | Subtotal; acciones: AccionesDeHoja }

// Las acciones de una columna con lo que la hoja suma a todas (la ayuda y el ⚙ abren lo mismo en las dos).
function useAccionesDeLaColumna(columna: ColumnaDelPar | undefined, comunes: AccionesDeHoja) {
  return useMemo<AccionesDeHoja | null>(
    () =>
      columna
        ? {
            ...columna.acciones,
            ...(comunes.alAyudar ? { alAyudar: comunes.alAyudar } : {}),
            ...(comunes.alAjustar ? { alAjustar: comunes.alAjustar } : {}),
          }
        : null,
    [columna, comunes.alAyudar, comunes.alAjustar],
  )
}

// Un nodo que cambia según la opción (glosario: «Variante en par»): dos hermanos de la rejilla con el mismo ancho, cada uno con su opción en el rótulo
// («Transporte · 20 pies»), lo tipeado y la respuesta de su columna y sus acciones. En el celular, una debajo de la otra (la rejilla de una columna). Los e2e los
// localizan por `data-nodo` y `data-opcion`.
export function ItemEnPar({ item, acciones }: Props) {
  const hoja = useContext(ContextoDelPar)
  const deA = useAccionesDeLaColumna(hoja?.columnas[0], acciones)
  const deB = useAccionesDeLaColumna(hoja?.columnas[1], acciones)
  if (hoja === null || deA === null || deB === null) return null
  const clase = claseDelItem(item)
  return (
    <>
      {hoja.columnas.map((columna, lado) => {
        const opcion = hoja.par.opciones[lado === 0 ? 0 : 1]
        const etiqueta = rotuloEnPar(item.etiqueta, opcion)
        return (
          <div
            key={opcion.clave}
            data-nodo={item.nodo}
            data-opcion={opcion.clave}
            className={clase}
          >
            {item.tipo === 'celda' ? (
              <CeldaDeHoja
                celda={{ ...item, etiqueta }}
                contexto={columna.contexto}
                acciones={lado === 0 ? deA : deB}
              />
            ) : (
              <SubtotalDeHoja
                item={{ ...item, etiqueta }}
                valor={valorDeSubtotal(item.nodo, columna.contexto.respuesta)}
              />
            )}
          </div>
        )
      })}
    </>
  )
}
