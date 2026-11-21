'use client'

import { useCallback, useState } from 'react'
import { ATRIBUTO_DE_COLUMNA } from './ficha-en-bloques/estilos'

// Margen para empezar a leer un poco antes de que la sección llegue a la pantalla.
const MARGEN = '200px'

// Quien se desplaza por dentro y lleva al nodo: la columna de una ficha en dos columnas (sólo cuando en este ancho se desplaza). El margen de la vista se
// cuenta desde su borde: con la ventana como raíz, lo que la columna recorta no entra en el margen y un bloque de más arriba nunca se «acerca».
function raizDeDesplazamiento(nodo: Element): Element | null {
  const columna = nodo.closest(`[${ATRIBUTO_DE_COLUMNA}]`)
  if (!columna) {
    return null
  }
  const { overflowY } = getComputedStyle(columna)
  return overflowY === 'auto' || overflowY === 'scroll' ? columna : null
}

// Si el nodo ya estuvo a la vista alguna vez (4.27-2): la sección de comentarios lee y pide su código recién ahí, no con la página. Con `seguir`, si lo está
// ahora (vuelve a `false` al salir: la imagen de la tarjeta que se va antes de su turno deja la cola). Sin `IntersectionObserver`, enseguida y para siempre.
export function useALaVista<T extends Element>({ seguir = false }: { seguir?: boolean } = {}): [
  (nodo: T | null) => (() => void) | undefined,
  boolean,
] {
  const [visto, setVisto] = useState(false)
  const observar = useCallback(
    (nodo: T | null) => {
      if (nodo === null) {
        return undefined
      }
      if (typeof IntersectionObserver === 'undefined') {
        setVisto(true)
        return undefined
      }
      const observador = new IntersectionObserver(
        (entradas) => {
          const ahora = entradas.some((entrada) => entrada.isIntersecting)
          if (seguir) {
            setVisto(ahora)
          } else if (ahora) {
            setVisto(true)
            observador.disconnect()
          }
        },
        { root: raizDeDesplazamiento(nodo), rootMargin: MARGEN },
      )
      observador.observe(nodo)
      return () => {
        observador.disconnect()
      }
    },
    [seguir],
  )
  return [observar, visto]
}
