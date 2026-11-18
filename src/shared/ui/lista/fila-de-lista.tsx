'use client'

import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { TableRow } from '../table'
import { manejadoresDelClic, type DestinoDeLaFila } from './ir-desde-la-fila'
import { CLASES_DE_VISTO, CLASES_DE_VISTO_DE_FILA, useVistoDeLista } from './visto'

// `alAbrir` abre el resumen de la fila; `href` lleva a su ficha (una lista sin resumen, con `<EnlaceDeLaFila>` en el nombre). Una lista sin
// ninguno (la del equipo) no pasa nada: la fila no promete un clic que no hace nada.
type Props = Omit<ComponentProps<'tr'>, 'onClick' | 'onAuxClick' | 'onMouseDown'> &
  DestinoDeLaFila & {
    // Su resumen está abierto: la fila se marca.
    abierta?: boolean
    // El id del registro, para su marca de «visto» (abierto antes en este módulo: el nombre se apaga) o «último visto» (borde de acento).
    idDeVisto?: string
  }

// Una fila de la tabla de una lista. Un clic en cualquier parte la abre (su resumen o su ficha), salvo el de lo que tiene adentro: una
// casilla, el «⋯», un enlace o un botón propio (`esClicPropio`). Con el teclado se alcanza el nombre (`<AbrirResumen>` o
// `<EnlaceDeLaFila>`) y Enter la abre; la fila entera toma el color de abierta cuando el nombre tiene el foco.
export function FilaDeLista({
  alAbrir,
  href,
  abierta = false,
  idDeVisto,
  className,
  ...props
}: Props) {
  const visto = useVistoDeLista(idDeVisto)
  const destino: DestinoDeLaFila = href === undefined ? { alAbrir } : { href }
  return (
    <TableRow
      data-state={abierta ? 'selected' : undefined}
      data-visto={visto ?? undefined}
      className={cn(
        'group h-(--fila)',
        (alAbrir ?? href) !== undefined && 'cursor-pointer',
        CLASES_DE_VISTO,
        CLASES_DE_VISTO_DE_FILA,
        className,
      )}
      {...manejadoresDelClic(destino)}
      {...props}
    />
  )
}
