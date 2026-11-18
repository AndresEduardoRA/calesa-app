'use client'

import { useId, type ReactNode } from 'react'
import type { GrupoPorPaso } from '../../../entities/items/grupos-por-paso'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { tituloDe } from './columnas-de-la-hoja'
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
      {c.item}
      <div className="@container grid min-w-0 grid-cols-1 gap-3 min-[24rem]:grid-cols-2">
        <Campo etiqueta={tituloDe('cantidad')}>{c.cantidad}</Campo>
        <Campo etiqueta={tituloDe('precio')}>{c.precio}</Campo>
        <div className="min-w-0 min-[24rem]:col-span-2">
          <Campo etiqueta={tituloDe('siguiente')}>{c.siguiente}</Campo>
        </div>
        <Campo etiqueta={tituloDe('pais')}>{c.pais}</Campo>
        <Campo etiqueta={tituloDe('via')}>{c.via}</Campo>
        <Campo etiqueta={tituloDe('moneda')}>{c.moneda}</Campo>
        <Campo etiqueta={tituloDe('tracking')}>{c.tracking}</Campo>
      </div>
      <Campo etiqueta={tituloDe('notas')}>{c.notas}</Campo>
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
// tabla: arriba qué es el ítem; luego cantidad, precio y el siguiente (a lo ancho y a 44 px); los demás datos; «Imágenes» y «Eliminar» al pie. La fila nueva va al final, fuera de los grupos. Nada ensancha la página: `min-w-0`
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
