'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { PistaDeDesborde } from '../pista-de-desborde'
import { useDesborde } from '../use-desborde'
import { irAlBloque } from './ir-al-bloque'
import { useBloqueALaVista } from './use-bloque-a-la-vista'

export type EntradaDelIndice = { ancla: string; etiqueta: string }

type Props = {
  bloques: readonly EntradaDelIndice[]
  etiqueta?: string
}

// Cuánto se corre el enlace actual hacia adentro de la barra al dejarlo a la vista.
const MARGEN_EN_LA_BARRA_PX = 16

// La posición de la barra que deja a la vista el enlace del bloque actual, sin mover la página (en el celular la barra no entra entera).
// Nula si ya se ve.
function desplazamientoParaVer(barra: HTMLElement, enlace: HTMLElement): number | null {
  const izquierda = enlace.offsetLeft - MARGEN_EN_LA_BARRA_PX
  const derecha = enlace.offsetLeft + enlace.offsetWidth + MARGEN_EN_LA_BARRA_PX
  if (izquierda < barra.scrollLeft) {
    return izquierda
  }
  if (derecha > barra.scrollLeft + barra.clientWidth) {
    return derecha - barra.clientWidth
  }
  return null
}

const sinSuscripcion = () => () => undefined

// El índice de una ficha en bloques: una barra con un enlace de ancla por bloque (`#ancla`: sin JS,
// igual saltan), pegajosa bajo la barra superior en el celular y quieta arriba de la columna en dos columnas (sus bloques se desplazan
// por dentro), que marca con `aria-current="location"` el bloque a la vista. Al pulsar uno se salta con `irAlBloque()` (el foco va al
// título del bloque). En el celular se desplaza de costado, con su pista de desborde.
export function IndiceDeBloques({ bloques, etiqueta = 'Índice de la ficha' }: Props) {
  const nav = useRef<HTMLElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(lista)
  const actual = useBloqueALaVista(nav)
  // La ficha llega dibujada por el servidor antes de que React enganche sus controles: lo mira el e2e (`data-hidratado`); a quien la usa no
  // le cambia nada.
  const hidratado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
  useEffect(() => {
    const barra = lista.current
    const enlace = actual
      ? barra?.querySelector<HTMLElement>(`a[href="#${CSS.escape(actual)}"]`)
      : null
    const destino = barra && enlace ? desplazamientoParaVer(barra, enlace) : null
    if (barra && destino !== null) {
      barra.scrollLeft = destino
    }
  }, [actual])
  if (bloques.length === 0) {
    return null
  }
  return (
    <nav
      ref={nav}
      aria-label={etiqueta}
      data-hidratado={hidratado}
      className="sticky top-(--topbar) z-10 min-w-0 border-b border-(--color-line) bg-(--color-paper) @[56rem]/ficha:static"
    >
      <div className="relative min-w-0">
        <ul ref={lista} className="relative flex h-(--alto-del-indice) gap-1 overflow-x-auto">
          {bloques.map((bloque) => {
            const esActual = bloque.ancla === actual
            return (
              <li key={bloque.ancla} className="shrink-0">
                <a
                  href={`#${bloque.ancla}`}
                  aria-current={esActual ? 'location' : undefined}
                  onClick={(evento) => {
                    if (irAlBloque(bloque.ancla)) {
                      evento.preventDefault()
                    }
                  }}
                  className={`inline-flex h-full items-center border-b-2 px-3 text-(length:--text-sm) font-medium whitespace-nowrap ${
                    esActual
                      ? 'border-(--color-primario) text-(--color-ink)'
                      : 'border-transparent text-(--color-ink-soft) hover:text-(--color-ink)'
                  }`}
                >
                  {bloque.etiqueta}
                </a>
              </li>
            )
          })}
        </ul>
        <PistaDeDesborde {...desborde} />
      </div>
    </nav>
  )
}
