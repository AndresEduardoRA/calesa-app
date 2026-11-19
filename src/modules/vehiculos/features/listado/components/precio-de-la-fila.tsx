'use client'

import { Monto } from '@/shared/ui/monto'
import {
  AYUDA_DE_LA_PUJA,
  encabezadoDePrecio,
  MONEDA_DE_LA_PUJA,
  rotuloDeLaPuja,
  type ColumnaDePrecio,
  type PrecioDeLaFila,
} from '../../../entities/precio-de-la-fila'

const VACIO = <span className="text-(--color-ink-faint)">—</span>

// El texto del encabezado de la columna: «Precio» o «Puja actual». La puja dice qué es (el `title` y, para quien lee en voz alta, el texto).
export function EncabezadoDePrecio({ columna }: { columna: ColumnaDePrecio }) {
  const texto = encabezadoDePrecio(columna)
  if (columna.tipo === 'precio') return texto
  return (
    <span title={AYUDA_DE_LA_PUJA}>
      {texto}
      <span className="sr-only">. {AYUDA_DE_LA_PUJA}.</span>
    </span>
  )
}

// La celda: el precio, la puja (en USD, con «final» si la subasta terminó o se vendió) o «—».
export function CeldaDePrecio({ precio }: { precio: PrecioDeLaFila | null }) {
  if (precio === null) return VACIO
  if (precio.tipo === 'precio') return <Monto valor={precio.valor} />
  return (
    <span title={AYUDA_DE_LA_PUJA} className="inline-flex items-baseline justify-end gap-1.5">
      <Monto valor={precio.valor} moneda={MONEDA_DE_LA_PUJA} />
      {precio.final ? (
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">final</span>
      ) : null}
    </span>
  )
}

// En la tarjeta de la lista el rótulo es de cada tarjeta: «Precio», o la puja con su nombre completo («Puja actual» o «Puja final»), que dice qué es.
export function RotuloDePrecioDeTarjeta({
  columna,
  precio,
}: {
  columna: ColumnaDePrecio
  precio: PrecioDeLaFila | null
}) {
  if (precio?.tipo !== 'puja') return <EncabezadoDePrecio columna={columna} />
  return (
    <span title={AYUDA_DE_LA_PUJA}>
      {rotuloDeLaPuja(precio.final)}
      <span className="sr-only">. {AYUDA_DE_LA_PUJA}.</span>
    </span>
  )
}

// Y el valor, sin la marca «final» (ya la dice el rótulo).
export function ValorDePrecioDeTarjeta({ precio }: { precio: PrecioDeLaFila | null }) {
  if (precio === null) return VACIO
  return (
    <Monto valor={precio.valor} moneda={precio.tipo === 'puja' ? MONEDA_DE_LA_PUJA : undefined} />
  )
}
