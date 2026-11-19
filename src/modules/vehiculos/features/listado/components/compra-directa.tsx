'use client'

import { Monto } from '@/shared/ui/monto'
import { MONEDA_DE_LA_COMPRA_DIRECTA } from '../../../entities/compra-directa-de-la-fila'

// La «Compra directa» de la subasta, en USD, o «—» si el origen no trae el campo o el vehículo no tiene el dato.
export function CeldaDeCompraDirecta({ valor }: { valor: number | null }) {
  return valor === null ? (
    <span className="text-(--color-ink-faint)">—</span>
  ) : (
    <Monto valor={valor} moneda={MONEDA_DE_LA_COMPRA_DIRECTA} />
  )
}
