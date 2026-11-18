'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import { EsquinaDeAcciones } from './esquina-de-acciones'
import { manejadoresDelClic, type DestinoDeLaFila } from './ir-desde-la-fila'
import { CLASES_DE_VISTO, useVistoDeLista } from './visto'

// `alAbrir` abre su resumen; `href` lleva a su ficha (con `<EnlaceDeLaFila>` en el nombre). Sin ninguno (la lista del equipo) la tarjeta no es
// un objetivo de clic.
type Props = DestinoDeLaFila & {
  abierta?: boolean
  // El id del registro, para su marca de «visto».
  idDeVisto?: string
  // El «⋯» y, si la lista las tiene, la casilla: objetivos propios de la tarjeta, fuera de la zona que abre. Van en su esquina de
  // arriba a la derecha (`<EsquinaDeAcciones>`); una tarjeta con foto arriba no los pasa acá: los pone sobre la foto.
  acciones?: ReactNode
  children: ReactNode
}

// Una tarjeta de la lista en el celular. Mide lo que la pantalla (`min-w-0`) y es un `@container`: con el texto al 200 % la tarjeta
// mide menos de 16 rem y sus piezas se apilan en vez de ensanchar la página (`@max-[16rem]:…`). Un clic en cualquier parte la abre (su
// resumen o su ficha), salvo el de lo que tiene adentro (`esClicPropio`); con el teclado se alcanza el nombre (`<AbrirResumen>` o
// `<EnlaceDeLaFila>`). Una `<ul>` de
// tarjetas es `grid-cols-[minmax(0,1fr)]`: una columna `auto` empujaría el «⋯» fuera de la vista.
export function TarjetaDeLista({
  alAbrir,
  href,
  abierta = false,
  idDeVisto,
  acciones,
  children,
}: Props) {
  const visto = useVistoDeLista(idDeVisto)
  const destino: DestinoDeLaFila = href === undefined ? { alAbrir } : { href }
  return (
    <li className="min-w-0">
      <article
        data-state={abierta ? 'selected' : undefined}
        data-visto={visto ?? undefined}
        className={cn(
          CLASES_DE_VISTO,
          '@container flex items-start rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) has-[[data-abre-resumen]:focus-visible]:bg-(--color-surface-2)',
          (alAbrir ?? href) !== undefined && 'cursor-pointer',
          abierta && 'bg-(--color-surface-2)',
        )}
        {...manejadoresDelClic(destino)}
      >
        <div className="grid min-h-11 min-w-0 flex-1 gap-2 p-3">{children}</div>
        {acciones ? <EsquinaDeAcciones>{acciones}</EsquinaDeAcciones> : null}
      </article>
    </li>
  )
}
