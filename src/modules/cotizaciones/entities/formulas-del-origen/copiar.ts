// Copiar una fórmula del origen: de qué orígenes se puede, con qué nombre empieza y qué versión se copia (docs/COTIZADOR.md › «Fórmulas del origen»). La base
// vuelve a pedir `cotizaciones.configurar` en los dos orígenes.
import { puede, type Permisos } from '@/shared/lib/permisos'
import { TOPE_DE_LA_LISTA_DE_ORIGENES } from '@/shared/lib/paginacion'
import { LARGO_DEL_NOMBRE } from '../formula-del-origen'
import type { FormulaDeLaLista } from './lista'

export type Pieza = 'publicada' | 'borrador'

export const SIN_OTRO_ORIGEN = 'No configuras el cotizador de otro origen.'

// Los orígenes de los que se puede copiar: los que la persona configura, sin el abierto, hasta el tope de la lista de orígenes.
export function origenesParaCopiar<O extends { id: string }>(
  origenes: readonly O[],
  permisos: Permisos,
  actualId: string,
): O[] {
  return origenes
    .filter((o) => o.id !== actualId && puede(permisos, 'cotizaciones.configurar', o.id))
    .slice(0, TOPE_DE_LA_LISTA_DE_ORIGENES)
}

const SUFIJO = ' (copia)'

// «<nombre> (copia)», recortado para que entre en los 60 caracteres (contados como la base: por punto de código).
export function nombreDeLaCopia(nombre: string): string {
  const base = [...nombre.trim()]
    .slice(0, LARGO_DEL_NOMBRE - SUFIJO.length)
    .join('')
    .trimEnd()
  return `${base}${SUFIJO}`
}

// De otro origen se copia la publicada y, si no tiene, el borrador; sin ninguna, nada.
export function piezaParaCopiarDeOtro(formula: Pick<FormulaDeLaLista, 'formula'>): Pieza | null {
  if (formula.formula.publicada) return 'publicada'
  if (formula.formula.borrador) return 'borrador'
  return null
}

// Por qué no se puede copiar esa versión de una fórmula (el texto de la base), o nulo si se puede.
export function motivoDeLaPieza(
  formula: Pick<FormulaDeLaLista, 'formula'>,
  pieza: Pieza,
): string | null {
  if (pieza === 'publicada') {
    return formula.formula.publicada ? null : 'Esa fórmula no tiene versión publicada.'
  }
  return formula.formula.borrador ? null : 'Esa fórmula no tiene borrador.'
}
