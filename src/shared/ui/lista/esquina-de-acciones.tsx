import type { ReactNode } from 'react'
import { cn } from 'cn'

type Props = {
  // Sobre una foto (la tarjeta grande del inventario): flota en su esquina con fondo translúcido y borde, para leerse sobre
  // cualquier imagen. Sin foto, es la columna de la derecha de la tarjeta.
  sobreImagen?: boolean
  // Sobre una foto, la casilla va a la izquierda: el espejo del «⋯».
  lado?: 'derecha' | 'izquierda'
  // Para ubicarla en una grilla (la tarjeta del kanban).
  className?: string
  children: ReactNode
}

// El lugar del «⋯» en una tarjeta de la lista: siempre arriba a la derecha y siempre a la vista. Sin foto es una columna que reserva su
// ancho (nunca tapa el título); sobre una foto, la esquina superior derecha, espejo de la casilla de la izquierda. Es el único
// contenedor de lo que lleva adentro (reemplaza al `div` que había): no suma nodos por ítem. `data-no-abre`: un clic en su relleno o su
// borde no abre la tarjeta (`esClicPropio`). Define `--tamano-del-mas`: el «⋯» mide 44 px en toda tarjeta, también en escritorio.
// En la tabla el lugar es `CeldaPegada lado="acciones"` (`tabla-de-lista.tsx`).
export function EsquinaDeAcciones({
  sobreImagen = false,
  lado = 'derecha',
  className,
  children,
}: Props) {
  return (
    <div
      data-no-abre=""
      className={cn(
        // Vacía (un menú que no dibuja nada para quien mira) no deja hueco.
        '[--tamano-del-mas:44px] empty:hidden',
        sobreImagen
          ? cn(
              'absolute top-1 box-content flex min-h-[44px] min-w-[44px] items-center justify-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface)/85 text-(--color-ink) shadow-(--shadow-sm)',
              lado === 'derecha' ? 'right-1' : 'left-1',
            )
          : 'flex shrink-0 items-start p-1',
        className,
      )}
    >
      {children}
    </div>
  )
}
