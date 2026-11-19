'use client'

import { diferido } from '@/shared/ui/diferido'

// La hoja en par (glosario: «Variante en par») se pide sólo cuando la fórmula tiene su variante en par: la hoja de siempre no la carga en frío.
export const PantallaDeCotizarEnParDiferida = diferido(() =>
  import('./pantalla-de-cotizar-en-par').then((modulo) => modulo.PantallaDeCotizarEnPar),
)

export const PantallaDeUnParGuardadoDiferida = diferido(() =>
  import('./pantalla-de-un-par-guardado').then((modulo) => modulo.PantallaDeUnParGuardado),
)
