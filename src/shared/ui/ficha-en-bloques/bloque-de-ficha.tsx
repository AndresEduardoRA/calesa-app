'use client'

import type { ReactNode } from 'react'
import { useALaVista } from '../use-a-la-vista'
import { ATRIBUTO_DE_BLOQUE, TITULO_DE_BLOQUE } from './estilos'
import { LimiteDelBloque } from './limite-del-bloque'

type Props = {
  // El `id` del bloque: lo que nombran el índice (`#ancla`) y los enlaces que llevan a él.
  ancla: string
  // Su nombre: el del `h2` si lo dibuja el marco, el de la región y el de su error.
  titulo: string
  // El marco dibuja el `h2` (el bloque no trae el suyo). Sin esto, el bloque trae su propia región con su `h2`.
  conTitulo?: boolean
  // La columna: «principal» (bajo el índice) o «lateral» (la pegajosa de la izquierda, sin índice encima).
  lado?: 'principal' | 'lateral'
  // Lo de adentro se pide recién al acercarse (200 px antes de entrar a la vista): hasta entonces, `esqueleto`.
  alAcercarse?: boolean
  esqueleto?: ReactNode
  children: ReactNode
}

// El margen con el que un bloque queda al saltar a él: bajo la barra superior y el índice pegajoso (en la principal), o pegado al
// borde de su columna (en la lateral, que se desplaza sola).
const MARGEN_DEL_SALTO = {
  principal: 'scroll-mt-[calc(var(--topbar)+var(--alto-del-indice)+1rem)]',
  lateral: 'scroll-mt-4',
} as const

// Un bloque de una ficha en bloques: su ancla, su título y su límite de error (uno roto no tumba a los demás). No es `<Bloque>` (el
// plegable): un bloque de ficha siempre está a la vista.
export function BloqueDeFicha({
  ancla,
  titulo,
  conTitulo = false,
  lado = 'principal',
  alAcercarse = false,
  esqueleto = null,
  children,
}: Props) {
  const [observar, visto] = useALaVista<HTMLElement>()
  const contenido = !alAcercarse || visto ? children : esqueleto
  const cuerpo = (
    <LimiteDelBloque titulo={titulo} conTitulo={conTitulo}>
      {contenido}
    </LimiteDelBloque>
  )
  const propias = {
    id: ancla,
    [ATRIBUTO_DE_BLOQUE]: lado,
    ref: alAcercarse ? observar : undefined,
    // Una columna `minmax(0, 1fr)`: lo de adentro no ensancha la ficha (texto al 200 %, un vacío centrado).
    className: `grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 ${MARGEN_DEL_SALTO[lado]}`,
  }
  if (!conTitulo) {
    return <div {...propias}>{cuerpo}</div>
  }
  const idDelTitulo = `${ancla}-titulo`
  return (
    <section {...propias} aria-labelledby={idDelTitulo}>
      <h2 id={idDelTitulo} tabIndex={-1} className={TITULO_DE_BLOQUE}>
        {titulo}
      </h2>
      {cuerpo}
    </section>
  )
}
