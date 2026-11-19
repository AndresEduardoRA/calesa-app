// La «Compra directa» del inventario: el precio «Buy it now» de la subasta, el valor del campo del layout que apibara llena con `pricing.buy_now_usd` (en el
// catálogo, «Compra inmediata (USD)»). Se busca por esa ruta de apibara, nunca por la clave del campo, como la puja en `columnaDePrecio()`. Sólo en un origen
// de subasta; va en USD. Ese campo no se repite entre los «en tarjeta»: ya está en «Compra directa». Sin I/O.
import { numeroDe, type CampoConApibara } from './precio-de-la-fila'

export const CLAVE_APIBARA_DE_LA_COMPRA_DIRECTA = 'pricing.buy_now_usd'
export const MONEDA_DE_LA_COMPRA_DIRECTA = 'USD'
export const ROTULO_DE_LA_COMPRA_DIRECTA = 'Compra directa'

// `no_aplica`: el origen no es de subasta (ni columna ni fila). `sin_campo`: es de subasta pero su layout no trae el campo activo («—»).
export type ColumnaDeCompraDirecta =
  { tipo: 'no_aplica' } | { tipo: 'sin_campo' } | { tipo: 'campo'; clave: string }

export function columnaDeCompraDirecta(
  esSubasta: boolean,
  campos: readonly CampoConApibara[],
): ColumnaDeCompraDirecta {
  if (!esSubasta) return { tipo: 'no_aplica' }
  const campo = campos.find(
    (uno) => uno.activo && uno.claveApibara === CLAVE_APIBARA_DE_LA_COMPRA_DIRECTA,
  )
  return campo ? { tipo: 'campo', clave: campo.clave } : { tipo: 'sin_campo' }
}

// El valor de la fila; nulo = «—» (no hay campo, el vehículo no lo trae o no es un número).
export function compraDirectaDeLaFila(
  atributos: Readonly<Record<string, unknown>>,
  columna: ColumnaDeCompraDirecta,
): number | null {
  return columna.tipo === 'campo' ? numeroDe(atributos[columna.clave]) : null
}

// Los campos «en tarjeta» sin el de la compra directa (sería el mismo dato dos veces).
export function camposSinLaCompraDirecta<T extends { clave: string }>(
  campos: readonly T[],
  columna: ColumnaDeCompraDirecta,
): T[] {
  return columna.tipo === 'campo'
    ? campos.filter((campo) => campo.clave !== columna.clave)
    : [...campos]
}
