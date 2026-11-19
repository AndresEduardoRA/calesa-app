// Cómo abre la guardada de una hermana (glosario: «Cotizaciones hermanas»): en par, con las dos, sólo si la hermana se ve, está viva, no es inválida y quien
// mira puede guardar las dos o ninguna (nunca se dibuja editable lo que no se guarda); si no, sola, con el aviso. Puro.
import type { HermanaDeLaGuardada } from './hoja-de-una-guardada'
import { ladoDeLaOpcion, type ParDeHoja } from './hoja-en-par'

export type ModoDeLaHermana =
  { modo: 'par' } | { modo: 'sola'; aviso: string } | { modo: 'sin_hermana' }

export const avisoDeLaHermana = (etiqueta: string): string =>
  `La de ${etiqueta} no está disponible.`

export function modoDeLaHermana(
  hermana: HermanaDeLaGuardada | null | undefined,
  puedeGuardar: boolean,
  etiquetaDeLaOtra: string,
): ModoDeLaHermana {
  if (!hermana) return { modo: 'sin_hermana' }
  if (hermana.disponible && hermana.puedeGuardar === puedeGuardar) return { modo: 'par' }
  return { modo: 'sola', aviso: avisoDeLaHermana(etiquetaDeLaOtra) }
}

// «Cotizar encima» de una hermana (glosario: «Cotizaciones hermanas»): con la hermana disponible y la publicada de hoy en par (lo dice la base), las dos anteriores
// en el orden de las opciones y la posición de la que se abrió (vuelve como creada); si no, nada y se cotiza encima de ésta sola.
export function encimaEnParDe(hoja: {
  cotizacion: { id: string }
  cadena: { puedeCotizarEncimaEnPar?: boolean }
  hermana?: HermanaDeLaGuardada | null
  opcionDelPar?: string | null
  diseno: { par?: ParDeHoja }
}): { anteriores: [string, string]; cual: 0 | 1 } | null {
  const par = hoja.diseno.par
  if (hoja.cadena.puedeCotizarEncimaEnPar !== true || !hoja.hermana?.disponible || !par) return null
  const cual = ladoDeLaOpcion(par, hoja.opcionDelPar) ?? 0
  const anteriores: [string, string] =
    cual === 0 ? [hoja.cotizacion.id, hoja.hermana.id] : [hoja.hermana.id, hoja.cotizacion.id]
  return { anteriores, cual }
}
