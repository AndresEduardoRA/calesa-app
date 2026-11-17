'use client'

import type { PasoDelProyecto } from '../../../entities/flujo/pasos'
import { TITULO_DEL_HITO, type PanelDelPaso } from '../../../entities/flujo/pasos-del-flujo'
import { BotonDelPanelDelPaso } from './boton-del-panel-del-paso'

type Props = {
  paso: PasoDelProyecto
  // Sin ítems, el paso va sólo con su nombre.
  conProgreso: boolean
  disponibles: readonly PanelDelPaso[]
  abierto: PanelDelPaso | null
  alElegirPanel: (panel: PanelDelPaso | null) => void
}

const CLASE_DE_LA_TARJETA =
  'grid min-w-36 content-start gap-1 rounded-(--radius-md) border bg-(--color-surface) px-3 py-2'

// Lo que se lee de un paso: el nombre, el progreso en texto y, para el lector, la frase entera («3 de 5 ítems llegaron a «Comprado»»).
function frase(paso: PasoDelProyecto): string {
  if (paso.tipo === 'fase') return `${paso.progreso.texto} ítems llegaron a «${paso.fase.nombre}»`
  return `${TITULO_DEL_HITO[paso.hito]}: ${paso.progreso.texto}`
}

// Un paso de la fila de pasos: una fase (con un punto del color de su fila de la base) o un hito (con borde punteado y, con permiso, el botón de su panel). El progreso
// va siempre en texto, nunca sólo en color.
export function TarjetaDelPaso({ paso, conProgreso, disponibles, abierto, alElegirPanel }: Props) {
  const nombre = paso.tipo === 'fase' ? paso.fase.nombre : TITULO_DEL_HITO[paso.hito]
  const conPanel = paso.tipo === 'hito' && disponibles.includes(paso.panel)
  return (
    <li
      data-paso={paso.tipo === 'fase' ? paso.fase.id : paso.hito}
      data-tipo-de-paso={paso.tipo}
      className="flex shrink-0 items-stretch"
    >
      <div
        className={`${CLASE_DE_LA_TARJETA} ${paso.tipo === 'hito' ? 'border-dashed border-(--color-ink-faint)' : 'border-(--color-line)'}`}
      >
        <span aria-hidden={conProgreso} className="flex items-center gap-1.5 font-medium">
          {paso.tipo === 'fase' ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: paso.fase.color }}
            />
          ) : null}
          {nombre}
        </span>
        {conProgreso ? (
          <>
            <span
              aria-hidden
              className="text-(length:--text-sm) text-(--color-ink-soft) tabular-nums"
            >
              {paso.progreso.texto}
            </span>
            <span className="sr-only">{frase(paso)}</span>
          </>
        ) : null}
        {conPanel ? (
          <div className="pt-1">
            <BotonDelPanelDelPaso panel={paso.panel} abierto={abierto} alElegir={alElegirPanel} />
          </div>
        ) : null}
      </div>
    </li>
  )
}
