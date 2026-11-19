'use client'

import { MARGEN_DEL_LIENZO } from '../../../../entities/plantilla/edicion/disposicion'
import { rotuloDeColumna } from '../../../../entities/plantilla/edicion/columnas'
import type { PlantillaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import { useArrastreDeColumna } from '../../hooks/use-arrastre-de-columna'

type PropsDeUna = {
  k: number
  id: string
  ancho: number
  x: number
  resto: number
  escala: number
  elegida: boolean
  alElegir: (k: number, extender: boolean) => void
  alProvisional: (k: number, ancho: number | null) => void
  alCambiar: (k: number, ancho: number, clave?: string) => void
  alVolver: () => void
}

// Una cabecera de columna: «B · Concepto 190 px» (tocarla elige la columna) y su borde derecho, que se arrastra para cambiar el ancho (un `separator` con su valor,
// fuera del orden de Tab: se llega con ↑ desde la primera fila).
function CabeceraDeColumna(props: PropsDeUna) {
  const { k, id, ancho, x, escala, elegida } = props
  const rotulo = rotuloDeColumna(k, id)
  const arrastre = useArrastreDeColumna({
    ancho,
    resto: props.resto,
    escala,
    clave: `ancho:${id}`,
    alProvisional: (a) => {
      props.alProvisional(k, a)
    },
    alCambiar: (a, clave) => {
      props.alCambiar(k, a, clave)
    },
    alVolver: props.alVolver,
  })
  return (
    <div
      role="columnheader"
      aria-colindex={k + 2}
      aria-selected={elegida}
      className="pointer-events-auto absolute top-0"
      style={{
        left: MARGEN_DEL_LIENZO.izquierda + x * escala,
        width: ancho * escala,
        height: MARGEN_DEL_LIENZO.arriba - 4,
      }}
      data-cabecera-de-columna={id}
    >
      <button
        type="button"
        tabIndex={-1}
        title={`${rotulo} ${String(ancho)} px`}
        onClick={(e) => {
          props.alElegir(k, e.shiftKey)
        }}
        className="flex size-full min-w-0 items-center gap-1 overflow-hidden rounded-t-(--radius-sm) border border-b-0 border-(--color-line) bg-(--color-surface-2) px-1 text-left text-(length:--text-xs) leading-none whitespace-nowrap outline-none hover:bg-(--color-surface-3) data-elegida:bg-(--color-primario-soft)"
        aria-label={`Elegir la columna «${rotulo}»`}
        {...(elegida ? { 'data-elegida': '' } : {})}
      >
        <span className="min-w-0 truncate font-medium text-(--color-ink)">{rotulo}</span>
        <span className="shrink-0 text-(--color-ink-soft) tabular-nums" data-ancho-de-columna="">
          {ancho} px
        </span>
      </button>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Ancho de la columna «${rotulo}»`}
        aria-valuenow={ancho}
        aria-valuemin={24}
        aria-valuemax={arrastre.maximo}
        tabIndex={-1}
        onPointerDown={arrastre.alBajar}
        onPointerMove={arrastre.alMover}
        onPointerUp={arrastre.alSubir}
        onPointerCancel={arrastre.alSubir}
        onKeyDown={arrastre.alTeclear}
        className="absolute top-0 -right-1.5 z-10 h-full w-3 cursor-col-resize touch-none rounded-(--radius-sm) outline-none hover:bg-(--color-primario)/40 focus-visible:bg-(--color-primario)/40 focus-visible:shadow-(--shadow-focus)"
        data-borde-de-columna={id}
      />
    </div>
  )
}

type Props = Omit<PropsDeUna, 'k' | 'id' | 'ancho' | 'x' | 'resto' | 'elegida'> & {
  plantilla: PlantillaEnCuadricula
  xs: readonly number[]
  elegidas: { desde: number; hasta: number } | null
}

// La fila de cabeceras de la grilla (`role="row"`, la primera): una por columna, con su letra, su nombre conocido y su ancho.
export function CabecerasDeColumna({ plantilla, xs, elegidas, ...resto }: Props) {
  const total = plantilla.columnas.reduce((s, c) => s + c.ancho, 0)
  return (
    <div
      role="row"
      aria-rowindex={1}
      className="pointer-events-none absolute inset-x-0 top-0"
      style={{ height: MARGEN_DEL_LIENZO.arriba }}
    >
      {plantilla.columnas.map((c, k) => (
        <CabeceraDeColumna
          key={c.id}
          k={k}
          id={c.id}
          ancho={c.ancho}
          x={xs[k] ?? 0}
          resto={total - c.ancho}
          elegida={elegidas !== null && k >= elegidas.desde && k <= elegidas.hasta}
          {...resto}
        />
      ))}
    </div>
  )
}
