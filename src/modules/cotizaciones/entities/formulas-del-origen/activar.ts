// Activar una fórmula del origen (docs/GLOSARIO.md): qué se publica, qué cambia y las esperadas que lleva el pedido. Todo sale de la fila que la lista leyó; si
// algo cambió desde entonces, la base responde PT409 y el modal ofrece «Recargar».
import type { FormulaDeLaLista, PiezasDeHoy } from './lista'

export type EsperadasDeActivar = {
  id: string
  esperada: string
  // La activa que se vio (nula: el origen no tenía).
  activaEsperada: string | null
  borradorEsperado: string | null
  publicadaEsperada: string | null
  plantillaBorradorEsperado: string | null
  plantillaPublicadaEsperada: string | null
}

export function esperadasDeActivar(
  formula: Pick<FormulaDeLaLista, 'id' | 'actualizadoEn' | 'formula' | 'tarjeta'>,
  activaId: string | null,
): EsperadasDeActivar {
  return {
    id: formula.id,
    esperada: formula.actualizadoEn,
    activaEsperada: activaId,
    borradorEsperado: formula.formula.borrador?.actualizadoEn ?? null,
    publicadaEsperada: formula.formula.publicada?.id ?? null,
    plantillaBorradorEsperado: formula.tarjeta.borrador?.actualizadoEn ?? null,
    plantillaPublicadaEsperada: formula.tarjeta.publicada?.id ?? null,
  }
}

export type LineaDeLoQueSePublica = {
  pieza: 'formula' | 'tarjeta'
  publica: boolean
  version: number
}

// Por pieza: si se publica su borrador (como la versión N+1) o se usa la publicada (la N).
export function loQueSePublica(
  formula: Pick<FormulaDeLaLista, 'formula' | 'tarjeta'>,
): LineaDeLoQueSePublica[] {
  const linea = (pieza: 'formula' | 'tarjeta', p: PiezasDeHoy): LineaDeLoQueSePublica => ({
    pieza,
    publica: p.borrador !== null,
    version: p.borrador !== null ? (p.publicada?.version ?? 0) + 1 : (p.publicada?.version ?? 0),
  })
  return [linea('formula', formula.formula), linea('tarjeta', formula.tarjeta)]
}

// «Las cotizaciones nuevas de USA usarán «Flete».» y lo que deja de usarse; siempre termina con que lo guardado no cambia.
export function loQueCambia(origen: string, nombre: string, activa: string | null): string[] {
  return [
    `Las cotizaciones nuevas de ${origen} usarán «${nombre}».`,
    activa === null
      ? `Hasta ahora ${origen} no se podía cotizar.`
      : `«${activa}» deja de usarse para cotizar.`,
    'Las cotizaciones ya guardadas no cambian.',
  ]
}
