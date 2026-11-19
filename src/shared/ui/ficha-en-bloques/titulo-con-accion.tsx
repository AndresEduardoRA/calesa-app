import type { ReactNode } from 'react'
import { TITULO_DE_BLOQUE } from './estilos'

type Props = {
  // El `id` del `h2`: lo nombra la región del bloque (`aria-labelledby`).
  id: string
  titulo: string
  // La acción principal del bloque (un enlace o un botón), o nada.
  accion?: ReactNode
}

// El título de un bloque que trae su propia región, con su acción principal a la derecha (una sola: «Menos ruido»). El `h2` es el que
// enfoca el índice al saltar (`tabIndex={-1}`). Con menos de 24 rem de ancho (el celular, el texto al 200 %) la acción baja a la línea de
// abajo, a lo ancho; se mide el bloque, no la pantalla (la columna de la derecha es angosta en escritorio).
export function TituloDeBloqueConAccion({ id, titulo, accion }: Props) {
  return (
    <div className="@container/titulo-del-bloque flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <h2 id={id} tabIndex={-1} className={`${TITULO_DE_BLOQUE} min-w-0 grow`}>
        {titulo}
      </h2>
      {accion ? (
        <div className="flex w-full @sm/titulo-del-bloque:ml-auto @sm/titulo-del-bloque:w-auto [&>*]:grow">
          {accion}
        </div>
      ) : null}
    </div>
  )
}
