// La pregunta antes de reemplazar los borradores del origen con una plantilla de V1, o nula si no hay ninguno. Pura. La tarjeta no guarda quién la editó: su
// parte dice cuándo se guardó. docs/UX.md › «Cotización: empezar desde una plantilla (estados propios)».
import { fechaRelativa } from '@/shared/lib/fechas'

export type BorradoresDelOrigen = {
  readonly formula: {
    readonly autor: string
    readonly tuyo: boolean
    readonly actualizadoEn: string
  } | null
  readonly tarjeta: { readonly actualizadoEn: string } | null
}

export function preguntaDeReemplazo(
  origen: string,
  plantilla: string,
  borradores: BorradoresDelOrigen,
  reloj: { readonly ahora: Date; readonly zona: string },
): string | null {
  const cuando = (iso: string) => fechaRelativa(iso, reloj)
  const { formula, tarjeta } = borradores
  const partes = [
    formula === null
      ? null
      : `de la fórmula (${formula.tuyo ? 'tuyo' : `de ${formula.autor}`}, ${cuando(formula.actualizadoEn)})`,
    tarjeta === null ? null : `de la tarjeta (guardado ${cuando(tarjeta.actualizadoEn)})`,
  ].filter((x) => x !== null)
  if (partes.length === 0) return null
  const loQueTiene = partes.length === 2 ? `${partes[0]} y ${partes[1]}` : partes[0]
  return `${origen} ya tiene un borrador ${loQueTiene}. Usar «${plantilla}» ${partes.length === 2 ? 'los reemplaza' : 'lo reemplaza'}.`
}
