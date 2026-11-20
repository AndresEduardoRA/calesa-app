// El título de todo bloque de una ficha en bloques (el `h2` que el índice enfoca al saltar): la misma clase en todos, los que dibuja
// el marco (`conTitulo`) y los que trae el bloque.
export const TITULO_DE_BLOQUE = 'text-(length:--text-base) font-semibold text-(--color-ink)'

// El alto del índice pegajoso, en rem (con el texto al 200 % crece con él): lo usan la barra, el margen con el que un bloque queda bajo
// ella al saltar (`scroll-mt`) y la línea que decide qué bloque está a la vista.
export const ALTO_DEL_INDICE = '[--alto-del-indice:2.75rem] md:[--alto-del-indice:2.25rem]'

// Lo que el marco pone en cada bloque y en su raíz: el índice los busca por estos atributos.
export const ATRIBUTO_DE_BLOQUE = 'data-bloque-de-ficha'
export const ATRIBUTO_DE_LA_FICHA = 'data-ficha-en-bloques'

// El aviso de que se saltó a un bloque a propósito (el índice, un enlace, la llegada por la URL): el índice lo marca aunque la página
// no pueda bajar tanto como para que su borde llegue a la línea.
export const EVENTO_DE_SALTO = 'ficha:salto-a-un-bloque'

// Las columnas que se desplazan por dentro cuando la ficha va en dos (desde 56 rem de contenedor): cada una lleva este atributo con su
// nombre. Los hooks las buscan por él (qué bloque está a la vista, dónde quedó cada una al volver).
export const ATRIBUTO_DE_COLUMNA = 'data-columna-de-ficha'
export type ColumnaDeFicha = 'lateral' | 'principal'

// El alto de la ficha en dos columnas: la ventana menos la barra superior (`--topbar`) y el `md:p-6` de `<main>` (3 rem: 1,5 arriba y 1,5
// abajo), para que la página no se desplace y lo haga cada columna por dentro. Con menos de 28 rem de alto (una ventana muy baja, o avisos
// altos arriba) la página vuelve a desplazarse: las columnas no se aplastan. Por debajo de 56 rem de contenedor (el celular, el texto al 200 %),
// alto natural. Una clase literal, para que Tailwind la vea; la comparten la ficha y su esqueleto.
export const ALTO_DE_LA_FICHA =
  '@[56rem]/ficha:h-[calc(100dvh-var(--topbar)-3rem)] @[56rem]/ficha:min-h-[28rem]'
