'use client'

import type { ComponentType } from 'react'
import type { PlantillaDeV1ParaElegir } from '../../../../entities/plantilla/datos-de-plantillas-de-v1'
import type { ClaveDePlantillaDeV1 } from '../../../../entities/plantillas-de-v1/claves'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'

type Props = {
  plantillas: readonly PlantillaDeV1ParaElegir[]
  elegida: ClaveDePlantillaDeV1 | null
  alElegir: (clave: ClaveDePlantillaDeV1) => void
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
  bloqueada: boolean
}

// Las cuatro plantillas como un grupo de opciones: cada tarjeta lleva el nombre, la frase y la tarjeta de la cotización con cifras de ejemplo (el lienzo de la pestaña
// Tarjeta, achicado a su marco; es una muestra, los lectores de pantalla no la leen) y, si sus colores no caben en el catálogo, el motivo. En una columna hasta `md`.
export function ListaDePlantillas({ plantillas, elegida, alElegir, Lienzo, bloqueada }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Plantillas de V1"
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      {plantillas.map((p) => (
        <label
          key={p.clave}
          className="grid min-w-0 cursor-pointer content-start gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 has-checked:border-(--color-primario) has-checked:bg-(--color-primario-soft) has-focus-visible:shadow-(--shadow-focus) has-disabled:cursor-not-allowed"
        >
          <span className="flex min-w-0 items-start gap-2">
            <input
              type="radio"
              name="plantilla-de-v1"
              value={p.clave}
              checked={elegida === p.clave}
              disabled={bloqueada}
              onChange={() => alElegir(p.clave)}
              className="mt-1 size-4 shrink-0 accent-(--color-primario) outline-none"
            />
            <span className="grid min-w-0 gap-0.5">
              <span className="font-medium text-(--color-ink)">{p.nombre}</span>
              <span className="text-(length:--text-sm) text-(--color-ink-soft)">{p.frase}</span>
            </span>
          </span>
          <span
            aria-hidden
            className="block aspect-[3/2] min-w-0 overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-white"
          >
            <Lienzo lectura={p.lectura} referencia={null} escala="ajustar" />
          </span>
          {p.colores.tipo === 'no_caben' ? (
            <span className="text-(length:--text-sm) text-(--color-aviso-ink)">
              {p.colores.motivo}
            </span>
          ) : null}
        </label>
      ))}
    </div>
  )
}
