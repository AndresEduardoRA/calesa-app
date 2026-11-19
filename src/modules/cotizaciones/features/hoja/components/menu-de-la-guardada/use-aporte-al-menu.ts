'use client'

import { useContext, useEffect, useId, useRef, type RefObject } from 'react'
import { ContextoDelMenuEstable, type AporteAlMenu, type LineaDelMenu } from './contexto'

// Las mismas líneas, con lo que hacen leído en el momento: así un aporte no cambia en cada dibujo (sólo cuando cambia lo que se ve).
function conManejadoresVivos(
  aporte: AporteAlMenu,
  ultimo: RefObject<AporteAlMenu | null>,
): AporteAlMenu {
  return Object.fromEntries(
    Object.entries(aporte).map(([clave, linea]): [string, LineaDelMenu] => {
      const actual = () => ultimo.current?.[clave as keyof AporteAlMenu]
      return [
        clave,
        linea.tipo === 'accion'
          ? {
              ...linea,
              alElegir: () => {
                const l = actual()
                if (l?.tipo === 'accion') l.alElegir()
              },
            }
          : {
              ...linea,
              alCambiar: (marcada) => {
                const l = actual()
                if (l?.tipo === 'casilla') l.alCambiar(marcada)
              },
            },
      ]
    }),
  )
}

// Suma líneas al «⋯» de la guardada mientras el componente está montado (nulo: nada que sumar ahora) y devuelve si hay «⋯» y su botón, para devolverle el foco al cerrar lo
// que se abrió desde él. Sin el proveedor (la hoja nueva), `enElMenu` es falso: quien llama dibuja su botón como siempre.
export function useAporteAlMenu(aporte: AporteAlMenu | null): {
  enElMenu: boolean
  botonRef: RefObject<HTMLButtonElement | null> | null
} {
  const menu = useContext(ContextoDelMenuEstable)
  const id = useId()
  const ultimo = useRef(aporte)
  // Lo que se ve de cada línea (sin las funciones): cambia el aporte sólo cuando cambia esto.
  const firma = aporte === null ? null : JSON.stringify(aporte)
  useEffect(() => {
    ultimo.current = aporte
  })
  useEffect(() => {
    if (menu === null) {
      return
    }
    const actual = ultimo.current
    menu.aportar(id, actual === null ? null : conManejadoresVivos(actual, ultimo))
    return () => {
      menu.aportar(id, null)
    }
  }, [menu, id, firma])
  return { enElMenu: menu !== null, botonRef: menu?.botonRef ?? null }
}
