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
