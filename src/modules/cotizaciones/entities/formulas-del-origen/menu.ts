// El «⋯» de una fórmula del origen: el mismo en su fila de la lista y en la cabeza de su editor (docs/UX.md). Quien lo dibuja
// pone qué hace cada línea; aquí sólo cuáles van, en qué orden y por qué una está apagada.
import type { AccionDeMenu } from '@/shared/ui/lista'
import { tieneTarjeta, tieneVersion, type FormulaDeLaLista } from './lista'

export const NOTA_SIN_TARJETA = 'Guarda una tarjeta antes de activarla.'
export const NOTA_SIN_VERSION = 'Guarda la planilla antes de activarla.'
export const NOTA_DE_LA_ACTIVA = 'La fórmula activa no se archiva: activa otra primero.'

type Formula = Pick<
  FormulaDeLaLista,
  'activa' | 'activadaEn' | 'archivadaEn' | 'formula' | 'tarjeta'
>

export type QuehaceresDelMenu = {
  alRenombrar: () => void
  alCopiar: () => void
  alActivar: () => void
  alArchivar: () => void
  alEliminar: () => void
}

const accion = (
  clave: string,
  etiqueta: string,
  alElegir: () => void,
  extra: Partial<Extract<AccionDeMenu, { tipo: 'accion' }>> = {},
): AccionDeMenu => ({ tipo: 'accion', clave, etiqueta, alElegir, despuesDeCerrar: true, ...extra })

// Renombrar · Copiar · Activar… · ─ · Eliminar (si nunca estuvo activa) o Archivar (si lo estuvo). La activa no ofrece «Activar…» (lo pendiente se publica desde
// su planilla o su tarjeta) y en lugar de archivar dice por qué no; sin tarjeta o sin versión, «Activar…» queda apagada con su motivo. Una archivada no se
// edita: sólo Renombrar y Copiar.
export function menuDeLaFormulaDelOrigen(formula: Formula, q: QuehaceresDelMenu): AccionDeMenu[] {
  const comunes = [
    accion('renombrar', 'Renombrar', q.alRenombrar),
    accion('copiar', 'Copiar', q.alCopiar),
  ]
  if (formula.archivadaEn !== null) return comunes
  if (formula.activa) {
    return [
      ...comunes,
      { tipo: 'separador', clave: 'antes-de-archivar' },
      { tipo: 'nota', clave: 'nota-de-la-activa', texto: NOTA_DE_LA_ACTIVA },
    ]
  }
  const motivo = !tieneVersion(formula)
    ? NOTA_SIN_VERSION
    : !tieneTarjeta(formula)
      ? NOTA_SIN_TARJETA
      : null
  return [
    ...comunes,
    accion('activar', 'Activar…', q.alActivar, { deshabilitada: motivo !== null }),
    ...(motivo ? [{ tipo: 'nota' as const, clave: 'motivo-de-activar', texto: motivo }] : []),
    { tipo: 'separador', clave: 'antes-de-archivar' },
    formula.activadaEn === null
      ? accion('eliminar', 'Eliminar', q.alEliminar, { destructiva: true })
      : accion('archivar', 'Archivar', q.alArchivar, { destructiva: true }),
  ]
}
