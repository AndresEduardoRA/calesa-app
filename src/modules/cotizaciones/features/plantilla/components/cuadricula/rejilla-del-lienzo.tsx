'use client'

import type { ClipboardEvent, KeyboardEvent, MouseEvent, PointerEvent, RefObject } from 'react'
import type { PlantillaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import type { PiezaDeLaCapa } from '../../../../entities/plantilla/edicion/disposicion'
import type { AccionDelEditor } from '../../../../entities/plantilla/edicion/reductor'
import { seleccionarFilas, type Seleccion } from '../../../../entities/plantilla/edicion/seleccion'
import type { CapaCalculada } from '../../hooks/use-capa-de-edicion'
import { CabecerasDeColumna } from './cabeceras-de-columna'
import { FilaDeLaCapa } from './fila-de-la-capa'

type Oyentes = {
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  onCopy: (e: ClipboardEvent<HTMLElement>) => void
  onPaste: (e: ClipboardEvent<HTMLElement>) => void
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void
  onPointerOver: (e: PointerEvent<HTMLDivElement>) => void
  onDoubleClick: (e: MouseEvent<HTMLDivElement>) => void
  onContextMenu: (e: MouseEvent<HTMLDivElement>) => void
  onFocus: () => void
  onBlur: () => void
}

type Props = {
  rejilla: RefObject<HTMLDivElement | null>
  capa: CapaCalculada
  plantilla: PlantillaEnCuadricula
  escala: number
  seleccion: Seleccion | null
  hacer: (accion: AccionDelEditor) => void
  ocupado: boolean
  nombreDe: (pieza: PiezaDeLaCapa) => string | undefined
  oyentes: Oyentes
  enfocar: () => void
  alAnchoProvisional: (provisional: { columna: number; ancho: number } | null) => void
}

const entre = (n: number, a: number, b: number) => n >= Math.min(a, b) && n <= Math.max(a, b)

// La grilla accesible del lienzo (`role="grid"`): la fila de cabeceras y una fila por cada fila que se dibuja. Un solo `tabindex=0`: la celda del cursor va por
// `aria-activedescendant` y Tab sale de la grilla al panel.
export function RejillaDelLienzo(props: Props) {
  const { rejilla, capa, plantilla, escala, seleccion: sel, hacer, oyentes } = props
  const { d, activa, cajaActiva } = capa
  return (
    <div
      ref={rejilla}
      role="grid"
      aria-label="Lienzo de la tarjeta"
      aria-rowcount={plantilla.filas.length + 1}
      aria-colcount={plantilla.columnas.length + 1}
      aria-multiselectable
      aria-activedescendant={cajaActiva === null ? undefined : capa.idDe(activa.f, activa.k)}
      tabIndex={0}
      data-lienzo=""
      className="absolute inset-0 outline-none select-none"
      {...oyentes}
    >
      <CabecerasDeColumna
        plantilla={plantilla}
        xs={d.xs}
        escala={escala}
        elegidas={
          sel?.tipo === 'columnas'
            ? { desde: Math.min(sel.desde, sel.hasta), hasta: Math.max(sel.desde, sel.hasta) }
            : null
        }
        alElegir={(k, extender) => {
          const desde = extender && sel?.tipo === 'columnas' ? sel.desde : k
          hacer({ tipo: 'seleccionar', seleccion: { tipo: 'columnas', desde, hasta: k } })
        }}
        alProvisional={(columna, ancho) => {
          props.alAnchoProvisional(ancho === null ? null : { columna, ancho })
        }}
        alCambiar={(columna, ancho, clave) => {
          hacer({ tipo: 'ancho', columna, ancho, ...(clave === undefined ? {} : { clave }) })
        }}
        alVolver={props.enfocar}
      />
      {d.filas.map((f) => (
        <FilaDeLaCapa
          key={f.id}
          fila={f}
          piezas={capa.piezas.get(f.indice) ?? []}
          escala={escala}
          rango={capa.rango}
          idDe={capa.idDe}
          nombreDe={props.nombreDe}
          ocupado={props.ocupado}
          filaElegida={sel?.tipo === 'filas' && entre(f.indice, sel.desde, sel.hasta)}
          alElegirLaFila={(fila, extender) => {
            hacer({
              tipo: 'seleccionar',
              seleccion:
                extender && sel?.tipo === 'filas'
                  ? { tipo: 'filas', desde: sel.desde, hasta: fila }
                  : seleccionarFilas(fila),
            })
          }}
          alVolver={props.enfocar}
        />
      ))}
    </div>
  )
}
