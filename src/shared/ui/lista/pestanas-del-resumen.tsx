'use client'

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { PistaDeDesborde } from '../pista-de-desborde'
import { traerLaAbiertaALaVista } from '../traer-la-abierta-a-la-vista'
import { useDesborde } from '../use-desborde'

type Pestana<C extends string> = { clave: C; titulo: string }

type Props<C extends string> = {
  // Qué agrupan: «Secciones del lead». Es el nombre accesible de la lista de pestañas.
  etiqueta: string
  pestanas: readonly Pestana<C>[]
  activa: C
  alElegir: (clave: C) => void
  // `'contenido'` (por defecto): el alto es el de lo que se dibuja. `'lleno'`: ocupa el alto de su contenedor (que debe tenerlo), la lista arriba y el panel con el resto, para que cada pestaña se desplace dentro de su marco.
  alto?: 'contenido' | 'lleno'
  // `'compacto'` (por defecto): las pestañas miden lo que dice su texto y, desde 768 px, la lista es del ancho de su contenido. `'igual'`: la lista ocupa todo el ancho y cada pestaña
  // una parte igual (con 44 px de alto en toda pantalla); si el texto no cabe, se desplaza de costado.
  reparto?: 'compacto' | 'igual'
  // Con `alto="lleno"`, el panel se desplaza por su cuenta (el marco de arriba queda fijo): para un panel cuyo contenido no se desplaza solo.
  panelDesplazable?: boolean
  // Lo de la pestaña elegida: sólo se dibuja ésa, y cada una lee y carga lo suyo al elegirse.
  children: ReactNode
}

// Flechas, Inicio y Fin recorren las pestañas (patrón «tabs» de WAI-ARIA): la pestaña elegida es la única parada de Tab, y moverse
// la elige.
function destinoDe<C extends string>(
  pestanas: readonly Pestana<C>[],
  actual: C,
  tecla: string,
): C | null {
  const i = pestanas.findIndex((p) => p.clave === actual)
  const n = pestanas.length
  const destino: Record<string, number> = {
    ArrowRight: (i + 1) % n,
    ArrowLeft: (i - 1 + n) % n,
    Home: 0,
    End: n - 1,
  }
  const j = destino[tecla]
  return j === undefined ? null : (pestanas[j]?.clave ?? null)
}

function BotonDePestana<C extends string>({
  id,
  panel,
  pestana,
  elegida,
  igual,
  alElegir,
}: {
  id: string
  panel: string
  pestana: Pestana<C>
  elegida: boolean
  igual: boolean
  alElegir: (clave: C) => void
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      data-pestana={pestana.clave}
      aria-selected={elegida}
      aria-controls={panel}
      tabIndex={elegida ? 0 : -1}
      onClick={() => {
        alElegir(pestana.clave)
      }}
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-3 text-(length:--text-sm) font-medium whitespace-nowrap outline-none focus-visible:shadow-(--shadow-focus) ${
        igual ? 'md:min-h-9' : 'flex-1 shrink-0 md:h-full md:min-h-0 md:flex-none'
      } ${elegida ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'}`}
    >
      {pestana.titulo}
    </button>
  )
}

// Las pestañas de un resumen (`?pestana=`), sin números: contar crece con el total. Una lista de pestañas propia: la de Base UI sumaba
// su peso a la carga del listado. 44 px de alto en el celular. Con el texto al 200 % no caben: la lista se desplaza de costado, dice que
// sigue (`<PistaDeDesborde>`) y deja a la vista la elegida.
export function PestanasDelResumen<C extends string>({
  etiqueta,
  pestanas,
  activa,
  alElegir,
  alto = 'contenido',
  reparto = 'compacto',
  panelDesplazable = false,
  children,
}: Props<C>) {
  const igual = reparto === 'igual'
  const id = useId()
  const lista = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(lista)
  // Sólo la barra se mueve: el cuerpo del panel que la contiene se queda donde está.
  useEffect(() => {
    if (lista.current) {
      traerLaAbiertaALaVista(lista.current)
    }
  }, [activa])
  const alPulsar = (evento: KeyboardEvent) => {
    const destino = destinoDe(pestanas, activa, evento.key)
    if (destino === null) {
      return
    }
    evento.preventDefault()
    alElegir(destino)
    lista.current?.querySelector<HTMLElement>(`[data-pestana="${destino}"]`)?.focus()
  }
  return (
    <div
      className={`grid min-w-0 gap-4 ${alto === 'lleno' ? 'h-full grid-rows-[auto_minmax(0,1fr)]' : ''}`}
    >
      <div className={`relative min-w-0 ${igual ? '' : 'md:w-fit'}`}>
        <div
          ref={lista}
          role="tablist"
          aria-label={etiqueta}
          onKeyDown={alPulsar}
          className={`bg-muted text-muted-foreground w-full overflow-x-auto rounded-lg p-[3px] ${
            igual
              ? 'grid auto-cols-[minmax(max-content,1fr)] grid-flow-col items-stretch'
              : 'flex items-center md:h-8'
          }`}
        >
          {pestanas.map((p) => (
            <BotonDePestana
              key={p.clave}
              id={`${id}-${p.clave}`}
              panel={`${id}-panel`}
              pestana={p}
              elegida={p.clave === activa}
              igual={igual}
              alElegir={alElegir}
            />
          ))}
        </div>
        <PistaDeDesborde {...desborde} />
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${activa}`}
        className={
          alto === 'lleno' ? `min-h-0 ${panelDesplazable ? 'overflow-y-auto' : ''}` : undefined
        }
      >
        {children}
      </div>
    </div>
  )
}
