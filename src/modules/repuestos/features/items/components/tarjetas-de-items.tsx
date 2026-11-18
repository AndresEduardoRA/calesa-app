'use client'

import { useId, type ReactNode } from 'react'
import type { GrupoPorPaso } from '../../../entities/items/grupos-por-paso'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { controlesDeItem } from './controles-de-item'
import { AYUDA_DEL_GRUPO, EncabezadoDelGrupo } from './encabezado-del-grupo'

type Props = {
  grupos: readonly GrupoPorPaso[]
  contexto: ContextoDeLaHoja
  filaNueva: ReactNode
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</span>
      {children}
    </div>
  )
}

function TarjetaDeItem({ fila, contexto }: { fila: FilaDeItem; contexto: ContextoDeLaHoja }) {
  const c = controlesDeItem(fila, contexto)
  return (
    <li
      data-fila-de-item={fila.id}
      className="grid min-w-0 gap-3 rounded-(--radius-md) border border-(--color-border) p-3"
    >
      <Campo etiqueta="Descripción">{c.descripcion}</Campo>
      <div className="@container grid min-w-0 grid-cols-1 gap-3 min-[24rem]:grid-cols-2">
        <Campo etiqueta="Tipo de pieza">{c.tipoDePieza}</Campo>
        <Campo etiqueta="Condición">{c.condicion}</Campo>
        <Campo etiqueta="País">{c.pais}</Campo>
        <Campo etiqueta="Vía">{c.via}</Campo>
        <Campo etiqueta="Cantidad">{c.cantidad}</Campo>
        <Campo etiqueta="Precio al cliente">{c.precio}</Campo>
        <Campo etiqueta="Moneda">{c.moneda}</Campo>
        <Campo etiqueta="Tracking">{c.tracking}</Campo>
      </div>
      <Campo etiqueta="Notas">{c.notas}</Campo>
      <Campo etiqueta="Siguiente">{c.siguiente}</Campo>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap gap-1">
          {c.imagenes}
          {c.hueco}
          {c.eliminar}
        </div>
      </div>
    </li>
  )
}

function GrupoDeTarjetas({ grupo, contexto }: { grupo: GrupoPorPaso; contexto: ContextoDeLaHoja }) {
  const titulo = useId()
  return (
    <section
      data-grupo-de-paso={grupo.clave}
      aria-labelledby={titulo}
      className="grid min-w-0 gap-2"
    >
      <h2 id={titulo} title={AYUDA_DEL_GRUPO} className="text-(length:--text-sm) font-semibold">
        <EncabezadoDelGrupo grupo={grupo} />
      </h2>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {grupo.filas.map((fila) => (
          <TarjetaDeItem key={fila.id} fila={fila} contexto={contexto} />
        ))}
      </ul>
    </section>
  )
}

// La hoja en el celular (8.09-2, C8): una sección por grupo por paso (su `<h2>` con «Comprar · 3») y una tarjeta por ítem con los mismos controles de la fila de la
// tabla, uno bajo otro; el siguiente (a lo ancho), «Imágenes» y «Eliminar» al pie. La fila nueva va al final, fuera de los grupos. Nada ensancha la página: `min-w-0`
// en cada hijo.
export function TarjetasDeItems({ grupos, contexto, filaNueva }: Props) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {grupos.map((grupo) => (
        <GrupoDeTarjetas key={grupo.clave} grupo={grupo} contexto={contexto} />
      ))}
      {filaNueva ? (
        <div key="nueva" data-fila-de-item="nueva" className="min-w-0">
          {filaNueva}
        </div>
      ) : null}
    </div>
  )
}
