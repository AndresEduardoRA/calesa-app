'use client'

import { useRef, type ReactNode } from 'react'
import { PistaVerticalDeDesborde } from '../pista-de-desborde'
import { useDesbordeVertical } from '../use-desborde'
import {
  ALTO_DE_LA_FICHA,
  ALTO_DEL_INDICE,
  ATRIBUTO_DE_COLUMNA,
  ATRIBUTO_DE_LA_FICHA,
} from './estilos'
import { usePosicionDeLasColumnas } from './use-posicion-de-las-columnas'

type Props = {
  // Lo que va arriba de las dos columnas, a lo ancho (volver, avisos).
  antes?: ReactNode
  // La columna de la izquierda: la tarjeta con lo que identifica a quien se mira. En escritorio se desplaza sola si no cabe.
  lateral: ReactNode
  // El nombre de la columna de la izquierda cuando se desplaza sola y recibe el foco del teclado.
  etiquetaDelLateral: string
  // El índice de los bloques (`<IndiceDeBloques>`): arriba de la columna principal, fijo mientras sus bloques se desplazan.
  indice: ReactNode
  // El nombre de la columna principal cuando se desplaza sola y recibe el foco del teclado.
  etiquetaDeLosBloques?: string
  // Los bloques de la columna principal, en el orden del índice.
  children: ReactNode
}

// El corte lo decide el contenedor, no la pantalla (`@container/ficha`): desde 56 rem, dos columnas (la izquierda hasta 24 rem), cada una con
// su fila de alto fijo (`minmax(0, 1fr)`: el contenido no la estira); por debajo (y con el texto al 200 %, porque los rem crecen), una sola, la
// izquierda primero, con el desplazamiento de la página. En rem y con `minmax(0, …)`: nunca ensancha la página.
const COLUMNAS =
  'grid grid-cols-[minmax(0,1fr)] gap-4 @[56rem]/ficha:min-h-0 @[56rem]/ficha:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] @[56rem]/ficha:grid-rows-[minmax(0,1fr)] @[56rem]/ficha:gap-6'

// Una columna que en escritorio se desplaza por dentro: si lo que lleva no cabe, su propio desplazamiento (si no, su final quedaría
// inalcanzable), su pista y el foco del teclado, y sólo entonces. Va `relative`: lo absoluto de adentro (el texto sólo para lectores de
// pantalla) queda dentro de la columna; si no, su posición suelta alargaría la página.
function Desplazable({
  etiqueta,
  columna,
  fondo,
  cajaClase,
  envoltorioClase,
  children,
}: {
  etiqueta: string
  columna: 'lateral' | 'principal'
  fondo: 'tarjeta' | 'pagina'
  cajaClase: string
  envoltorioClase: string
  children: ReactNode
}) {
  const caja = useRef<HTMLDivElement>(null)
  const desborde = useDesbordeVertical(caja)
  const desplazable = desborde.arriba || desborde.abajo
  return (
    <div className={envoltorioClase}>
      <div
        ref={caja}
        {...{ [ATRIBUTO_DE_COLUMNA]: columna }}
        {...(desplazable ? { tabIndex: 0, role: 'region', 'aria-label': etiqueta } : {})}
        className={cajaClase}
      >
        {children}
      </div>
      <PistaVerticalDeDesborde {...desborde} fondo={fondo} />
    </div>
  )
}

// La izquierda: la tarjeta con lo que identifica, del alto de su contenido y, si no cabe en el de la ficha, con su desplazamiento.
function Lateral({ children, etiqueta }: { children: ReactNode; etiqueta: string }) {
  return (
    <Desplazable
      etiqueta={etiqueta}
      columna="lateral"
      fondo="tarjeta"
      envoltorioClase="relative flex min-w-0 flex-col @[56rem]/ficha:max-h-full @[56rem]/ficha:self-start"
      cajaClase="relative grid min-w-0 content-start gap-5 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 @[56rem]/ficha:min-h-0 @[56rem]/ficha:overflow-y-auto"
    >
      {children}
    </Desplazable>
  )
}

// La derecha: el índice arriba, quieto, y debajo los bloques con su desplazamiento. El margen de 0,25 rem a los lados deja ver el aro de foco de
// lo que toca el borde (el desplazamiento lo recortaría) sin mover el texto.
function Principal({
  indice,
  etiqueta,
  children,
}: {
  indice: ReactNode
  etiqueta: string
  children: ReactNode
}) {
  return (
    <div className="grid min-w-0 content-start gap-8 @[56rem]/ficha:h-full @[56rem]/ficha:min-h-0 @[56rem]/ficha:grid-rows-[auto_minmax(0,1fr)] @[56rem]/ficha:gap-0">
      {indice}
      <Desplazable
        etiqueta={etiqueta}
        columna="principal"
        fondo="pagina"
        envoltorioClase="relative min-w-0 @[56rem]/ficha:min-h-0"
        cajaClase="relative grid min-w-0 content-start gap-8 @[56rem]/ficha:h-full @[56rem]/ficha:-mx-1 @[56rem]/ficha:overflow-y-auto @[56rem]/ficha:px-1 @[56rem]/ficha:pt-8 @[56rem]/ficha:pb-4"
      >
        {children}
      </Desplazable>
    </div>
  )
}

// Una ficha en dos columnas: la página no se desplaza, cada columna lo hace por dentro. A la izquierda, lo que identifica a quien se mira; a la
// derecha, el índice fijo arriba y todos los bloques a la vista, sin pestañas ni acordeones. En el celular, una columna en el mismo orden (la
// izquierda, el índice y los bloques) con el desplazamiento de la página.
export function FichaEnDosColumnas({
  antes,
  lateral,
  etiquetaDelLateral,
  indice,
  etiquetaDeLosBloques = 'Bloques de la ficha',
  children,
}: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  usePosicionDeLasColumnas(raiz)
  return (
    <div
      ref={raiz}
      {...{ [ATRIBUTO_DE_LA_FICHA]: '' }}
      className={`@container/ficha ${ALTO_DEL_INDICE}`}
    >
      <div
        className={`grid gap-4 ${ALTO_DE_LA_FICHA} ${antes ? '@[56rem]/ficha:grid-rows-[auto_minmax(0,1fr)]' : '@[56rem]/ficha:grid-rows-[minmax(0,1fr)]'}`}
      >
        {antes ? <div className="grid gap-4">{antes}</div> : null}
        <div className={COLUMNAS}>
          <Lateral etiqueta={etiquetaDelLateral}>{lateral}</Lateral>
          <Principal indice={indice} etiqueta={etiquetaDeLosBloques}>
            {children}
          </Principal>
        </div>
      </div>
    </div>
  )
}
