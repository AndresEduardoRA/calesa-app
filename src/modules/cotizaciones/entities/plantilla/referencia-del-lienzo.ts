// La referencia con que se dibuja el lienzo del editor (`docs/GLOSARIO.md` › «Referencia de la tarjeta»): la cotización más reciente del origen que quien configura
// ve, o las cifras de ejemplo. La elección vive en la URL (`?referencia=ejemplo`, sin ir al servidor: el servidor siempre lee la referencia). Textos y reglas, puros.
import type { ReferenciaDeLaTarjeta, ReferenciaLeida } from '../referencia-de-la-tarjeta'

export const CLAVE_DE_REFERENCIA = 'referencia'
export const REFERENCIA_DE_EJEMPLO = 'ejemplo'

export const CIFRAS_DE_EJEMPLO = 'Cifras de ejemplo'
export const NO_SE_LEYO_LA_REFERENCIA = 'No se pudo leer la cotización de referencia.'

export const nombreDeLaReferencia = (r: ReferenciaLeida): string =>
  `Cotización n.º ${String(r.numero)}`

// Por qué no se puede elegir la cotización (sólo quedan las cifras de ejemplo), o nulo si se puede.
export function motivoSinCotizacion(r: ReferenciaDeLaTarjeta, origen: string): string | null {
  if (r.estado === 'cotizacion') return null
  return r.estado === 'sin_cotizacion'
    ? `Todavía no hay cotizaciones de ${origen} que veas: se usan cifras de ejemplo.`
    : NO_SE_LEYO_LA_REFERENCIA
}

// La referencia que dibuja el lienzo: la cotización, salvo que se pidan las cifras de ejemplo o no haya una; nula, cifras de ejemplo.
export const referenciaUsada = (
  r: ReferenciaDeLaTarjeta,
  ejemplo: boolean,
): ReferenciaLeida | null => (ejemplo || r.estado !== 'cotizacion' ? null : r)
