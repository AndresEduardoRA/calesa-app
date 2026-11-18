'use client'

import type { ReactNode } from 'react'
import { TablaDeLista } from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { GrupoPorPaso } from '../../../entities/items/grupos-por-paso'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import {
  CANTIDAD_DE_COLUMNAS,
  COLUMNAS_DE_LA_HOJA,
  claseDe,
  type ClaveDeColumna,
} from './columnas-de-la-hoja'
import { controlesDeItem } from './controles-de-item'
import { AYUDA_DEL_GRUPO, EncabezadoDelGrupo } from './encabezado-del-grupo'

type Props = {
  grupos: readonly GrupoPorPaso[]
  contexto: ContextoDeLaHoja
  // La fila de «Nuevo ítem», al final (sólo con `repuestos.editar`, proyecto abierto y menos de 200).
  filaNueva: ReactNode
}

// Los títulos de las columnas, cada uno con su ayuda en un `title` (subrayado punteado).
export function EncabezadoDeLaHoja() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNAS_DE_LA_HOJA.map((columna) => (
          <TableHead key={columna.clave} className={columna.clase}>
            {columna.ayuda === null ? (
              columna.titulo
            ) : (
              <span
                title={columna.ayuda}
                className="cursor-help underline decoration-dotted underline-offset-4"
              >
                {columna.titulo}
              </span>
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}

function FilaDeLaTabla({ fila, contexto }: { fila: FilaDeItem; contexto: ContextoDeLaHoja }) {
  const c = controlesDeItem(fila, contexto)
  const celda = (clave: ClaveDeColumna, contenido: ReactNode) => (
    <TableCell className={`align-top ${claseDe(clave)}`}>{contenido}</TableCell>
  )
  return (
    <TableRow data-fila-de-item={fila.id}>
      {celda('item', c.item)}
      {celda('cantidad', <span className="tabular-nums">{c.cantidad}</span>)}
      {celda('precio', c.precio)}
      {celda('siguiente', c.siguiente)}
      {celda('pais', c.pais)}
      {celda('via', c.via)}
      {celda('moneda', c.moneda)}
      {celda('tracking', c.tracking)}
      {celda('notas', c.notas)}
      {celda(
        'acciones',
        <div className="flex flex-wrap gap-1">
          {c.imagenes}
          {c.hueco}
          {c.eliminar}
        </div>,
      )}
    </TableRow>
  )
}

// La hoja en escritorio (8.09-2, C8): un `<tbody>` por grupo por paso con su encabezado (`<th scope="rowgroup">`) y una fila por ítem, editable celda a celda. Primero
// qué es el ítem, luego cantidad, precio y el siguiente: lo que se busca se ve sin desplazar la tabla; los demás datos después. Los números a la derecha; el precio,
// por `<Monto>` o `XCell`. La fila nueva va al final con la descripción: el resto de las columnas se llena después, con el teclado.
export function TablaDeItems({ grupos, contexto, filaNueva }: Props) {
  return (
    <TablaDeLista>
      <EncabezadoDeLaHoja />
      {grupos.map((grupo) => (
        <TableBody key={grupo.clave} data-grupo-de-paso={grupo.clave}>
          <TableRow className="hover:bg-transparent">
            <th
              scope="rowgroup"
              colSpan={CANTIDAD_DE_COLUMNAS}
              title={AYUDA_DEL_GRUPO}
              className="bg-(--color-paper-dim) px-2 py-1.5 text-left text-(length:--text-sm) font-semibold"
            >
              <EncabezadoDelGrupo grupo={grupo} />
            </th>
          </TableRow>
          {grupo.filas.map((fila) => (
            <FilaDeLaTabla key={fila.id} fila={fila} contexto={contexto} />
          ))}
        </TableBody>
      ))}
      {/* La fila nueva va al final, fuera de los grupos y con `key` propia: no se remonta cuando nace el primer grupo (perdería el foco del alta con teclado). */}
      {filaNueva ? (
        <TableBody key="nueva">
          <TableRow data-fila-de-item="nueva">
            <TableCell className={`align-top ${claseDe('item')}`}>{filaNueva}</TableCell>
            <TableCell colSpan={CANTIDAD_DE_COLUMNAS - 1} />
          </TableRow>
        </TableBody>
      ) : null}
    </TablaDeLista>
  )
}
