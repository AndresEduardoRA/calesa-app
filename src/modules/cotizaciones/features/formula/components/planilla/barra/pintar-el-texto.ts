// Lo tipeado en pedazos para la capa pintada de la barra de fórmula (D16): cada referencia con su color y el tramo del error con su subrayado. Puro.
import type { Tramo } from '../../../../../entities/motivos-del-compilador'
import type { ReferenciaTipeada } from '../../../../../entities/formula/referencias-tipeadas'

export type PedazoPintado = {
  readonly desde: number
  readonly texto: string
  // El color de la referencia que cubre el pedazo (`--viz-series-1..6`, en ciclo), o nulo.
  readonly color: number | null
  readonly error: boolean
}

export function pintarElTexto(
  texto: string,
  refs: readonly Pick<ReferenciaTipeada, 'desde' | 'hasta' | 'color'>[],
  tramo: Pick<Tramo, 'desde' | 'largo'> | null,
): PedazoPintado[] {
  const fin = texto.length
  const conError = tramo === null ? null : { desde: tramo.desde, hasta: tramo.desde + tramo.largo }
  const cortes = new Set([0, fin])
  for (const r of refs) cortes.add(r.desde).add(r.hasta)
  if (conError !== null) cortes.add(conError.desde).add(conError.hasta)
  const orden = [...cortes].filter((c) => c >= 0 && c <= fin).sort((a, b) => a - b)
  const pedazos: PedazoPintado[] = []
  for (let i = 0; i + 1 < orden.length; i++) {
    const desde = orden[i] ?? 0
    const hasta = orden[i + 1] ?? fin
    if (desde === hasta) continue
    pedazos.push({
      desde,
      texto: texto.slice(desde, hasta),
      color: refs.find((r) => r.desde <= desde && desde < r.hasta)?.color ?? null,
      error: conError !== null && conError.desde <= desde && desde < conError.hasta,
    })
  }
  return pedazos
}
