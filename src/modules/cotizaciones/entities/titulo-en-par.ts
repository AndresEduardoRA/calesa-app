// El título de una cotización hermana (glosario: «Cotizaciones hermanas»): cada una guarda «<título> · <etiqueta de su opción>»; la base compone el sufijo y el
// cliente manda siempre el título sin él. El manual tiene un tope menor (el sufijo más largo de las dos opciones tiene que caber). Puro.
import type { ParDeHoja } from './hoja-en-par'
import { largoDelTitulo, TOPE_DEL_TITULO } from './titulo-de-la-cotizacion'

const sufijo = (etiqueta: string) => ` · ${etiqueta}`

// Lo que puede medir el título sin la opción para que las dos quepan en 120.
export const topeDelTituloEnPar = (par: ParDeHoja): number =>
  TOPE_DEL_TITULO - Math.max(...par.opciones.map((o) => largoDelTitulo(sufijo(o.etiqueta))))

// El título sin la etiqueta de su opción (lo que se edita al abrir una hermana); si no la lleva, tal cual.
export function tituloBaseDeLaHermana(titulo: string | null, etiqueta: string): string | null {
  if (titulo === null) return null
  const fin = sufijo(etiqueta)
  return titulo.endsWith(fin) ? titulo.slice(0, -fin.length) : titulo
}

// El título con la etiqueta de su opción, como lo compone la base (para la tarjeta de la hoja nueva).
export const tituloDeLaHermana = (base: string, etiqueta: string): string =>
  `${base}${sufijo(etiqueta)}`
