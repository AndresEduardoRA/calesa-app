// Los ids que pone la conversión de la forma 1 a la cuadrícula (D4 de T310): deterministas, iguales en TS y en la base (`_plantilla_id_derivado()`), y con la forma
// de un id (`^[a-z][a-z0-9_]{0,40}$`). Los retoques por cotización y el editor de la cuadrícula se apoyan en ellos: no cambian si la plantilla no cambia.
// Un id largo se acorta con un hash espejado (FNV-1a de 32 bits sobre los bytes ASCII: los ids sólo llevan `a-z`, `0-9` y `_`), nunca con un `md5` que TS no
// tiene en síncrono.

const LARGO_MAXIMO = 41
const PREFIJO = 32

// FNV-1a de 32 bits, en 8 cifras hexadecimales. `Math.imul` y `>>> 0` dan el producto módulo 2³², como `% 4294967296` en la base.
export function fnv1a32(texto: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

// El texto tal cual si cabe en 41 caracteres; si no, sus primeros 32, `_` y el hash del texto entero (41 en total).
export const idDerivado = (texto: string): string =>
  texto.length <= LARGO_MAXIMO ? texto : `${texto.slice(0, PREFIJO)}_${fnv1a32(texto)}`

export const idDeLaFila = (prefijo: 'n' | 'a', nodo: string): string =>
  idDerivado(`${prefijo}_${nodo}`)

export const idDeLaCelda = (fila: string, columna: string): string =>
  idDerivado(`c_${fila}_${columna}`)
