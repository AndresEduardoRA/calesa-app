// La cotización aprobada de cada vehículo de una página del inventario, como la dibuja el «Costo estimado» (la columna de la tabla y la fila de la tarjeta de la
// lista). La arma `src/app` con lo que lee `cotizaciones` (este módulo no lo importa): su id (lo que abre «Compartir la cotización»), el primer resultado congelado con su moneda y el
// nombre del modo de tipo de cambio de la cotización. Sin I/O.

export const ROTULO_DEL_COSTO_ESTIMADO = 'Costo estimado'
export const SIN_TOTAL = 'Sin total'

export type CotizacionAprobadaDeLaFila = {
  // La cotización aprobada: el botón del «Costo estimado» abre «Compartir la cotización» de ésta (`?panel=compartir&para=<id>`).
  cotizacionId: string
  // El primer resultado como texto (`numeric`): nulo si la cotización no traía total.
  monto: string | null
  // La moneda congelada con el monto.
  moneda: string
  // El nombre del modo de tipo de cambio de la cotización («Unificado»); nulo si no tiene, la versión no lo trae o quien mira no ve su origen.
  modo: string | null
}

// Por id de vehículo. Un vehículo sin cotización aprobada, o con una que quien mira no ve, no está: «—».
export type AprobadasDeLaPagina = Readonly<Record<string, CotizacionAprobadaDeLaFila>>

export function aprobadaDeLaFila(
  aprobadas: AprobadasDeLaPagina,
  vehiculoId: string,
): CotizacionAprobadaDeLaFila | null {
  return Object.hasOwn(aprobadas, vehiculoId) ? (aprobadas[vehiculoId] ?? null) : null
}

// El monto para `<Monto>`: nulo si no hay o no es un número.
export function montoDeLaAprobada(aprobada: CotizacionAprobadaDeLaFila): number | null {
  if (aprobada.monto === null) {
    return null
  }
  const valor = Number(aprobada.monto)
  return Number.isFinite(valor) ? valor : null
}

// Lo que dice el «Costo estimado»: «Sin total» (sin modo) o el monto con su moneda y, si lo hay, el modo. Siempre es el botón que comparte esa cotización.
export type CostoEstimado =
  | { tipo: 'sin_total'; cotizacionId: string }
  | { tipo: 'monto'; cotizacionId: string; valor: number; moneda: string; modo: string | null }

export function costoEstimadoDe(aprobada: CotizacionAprobadaDeLaFila): CostoEstimado {
  const valor = montoDeLaAprobada(aprobada)
  if (valor === null) {
    return { tipo: 'sin_total', cotizacionId: aprobada.cotizacionId }
  }
  const modo = aprobada.modo?.trim() ?? ''
  return {
    tipo: 'monto',
    cotizacionId: aprobada.cotizacionId,
    valor,
    moneda: aprobada.moneda,
    modo: modo === '' ? null : modo,
  }
}

// El nombre accesible del botón: «Compartir la cotización aprobada (US$27.999 · Unificado)». `monto` es el monto ya formateado (lo da `formatearMonto`, como `<Monto>`).
export function nombreDeCompartirLaAprobada(costo: CostoEstimado, monto: string): string {
  const detalle =
    costo.tipo === 'sin_total'
      ? SIN_TOTAL
      : costo.modo === null
        ? monto
        : `${monto} · ${costo.modo}`
  return `Compartir la cotización aprobada (${detalle})`
}
