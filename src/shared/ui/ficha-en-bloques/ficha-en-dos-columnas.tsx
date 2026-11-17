'use client'

import { useRef, type ReactNode } from 'react'
import { PistaVerticalDeDesborde } from '../pista-de-desborde'
import { useDesbordeVertical } from '../use-desborde'
import { ALTO_DEL_INDICE, ATRIBUTO_DE_LA_FICHA } from './estilos'

type Props = {
  // Lo que va arriba de las dos columnas, a lo ancho (volver, avisos).
  antes?: ReactNode
  // La columna de la izquierda: la tarjeta con lo que identifica a quien se mira. Pegajosa en escritorio.
  lateral: ReactNode
  // El nombre de la columna de la izquierda cuando se desplaza sola y recibe el foco del teclado.
  etiquetaDelLateral: string
  // El índice de los bloques (`<IndiceDeBloques>`): pegajoso arriba de la columna principal.
  indice: ReactNode
  // Los bloques de la columna principal, en el orden del índice.
  children: ReactNode
}

// El corte lo decide el contenedor, no la pantalla (`@container/ficha`): desde 56 rem, dos columnas (la izquierda hasta 24 rem); por
// debajo (y con el texto al 200 %, porque los rem crecen), una sola, la izquierda primero. En rem y con `minmax(0, …)`: nunca ensancha
// la página.
const COLUMNAS =
  'grid grid-cols-[minmax(0,1fr)] gap-4 @[56rem]/ficha:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] @[56rem]/ficha:items-start @[56rem]/ficha:gap-6'

// La izquierda en escritorio: pegajosa bajo la barra superior y, si no cabe en la ventana, con su propio desplazamiento (si no, su final
// quedaría inalcanzable), su pista y el foco del teclado sólo cuando desborda.
function Lateral({ children, etiqueta }: { children: ReactNode; etiqueta: string }) {
  const caja = useRef<HTMLDivElement>(null)
  const desborde = useDesbordeVertical(caja)
  const desplazable = desborde.arriba || desborde.abajo
  return (
    <div className="relative min-w-0 @[56rem]/ficha:sticky @[56rem]/ficha:top-[calc(var(--topbar)+1rem)] @[56rem]/ficha:self-start">
      <div
        ref={caja}
        {...(desplazable ? { tabIndex: 0, role: 'region', 'aria-label': etiqueta } : {})}
        className="grid min-w-0 content-start gap-5 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 @[56rem]/ficha:max-h-[calc(100dvh-var(--topbar)-2rem)] @[56rem]/ficha:overflow-y-auto"
      >
        {children}
      </div>
      <PistaVerticalDeDesborde {...desborde} />
    </div>
  )
}

// Una ficha en dos columnas: a la izquierda, pegajosa, lo que identifica a quien se mira; a la derecha, el índice pegajoso y todos los
// bloques a la vista, sin pestañas ni acordeones. En el celular, una columna en el mismo orden (la izquierda, el índice y los bloques).
export function FichaEnDosColumnas({
  antes,
  lateral,
  etiquetaDelLateral,
  indice,
  children,
}: Props) {
  return (
    <div
      {...{ [ATRIBUTO_DE_LA_FICHA]: '' }}
      className={`@container/ficha grid gap-4 ${ALTO_DEL_INDICE}`}
    >
      {antes}
      <div className={COLUMNAS}>
        <Lateral etiqueta={etiquetaDelLateral}>{lateral}</Lateral>
        <div className="grid min-w-0 content-start gap-8">
          {indice}
          {children}
        </div>
      </div>
    </div>
  )
}
