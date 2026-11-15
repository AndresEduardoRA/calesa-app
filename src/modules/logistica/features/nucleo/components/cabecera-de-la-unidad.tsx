import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BadgeDeSituacion } from '@/modules/vehiculos/client'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { textoDeDiasEnLaFase } from '../../../entities/nucleo/dias-en-la-fase'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'

type Props = {
  unidad: UnidadAbierta
  // El nombre del origen de la unidad.
  origen: string
  // La fase de la unidad (nombre y color); nula si no tiene.
  fase: { nombre: string; color: string } | null
  // Una línea de aviso bajo la cabecera (p. ej. que no se pudo leer el flujo del origen).
  aviso?: string | null
  // La página la dibuja como una tarjeta compacta; un drawer, como una columna suelta.
  enLaPagina?: boolean
  // Sólo en la página: la portada (la compone `src/app`; `logistica` no conoce `vehiculos/fotos`) a la izquierda, y «Relacionados» en una línea dentro de la cabecera.
  foto?: ReactNode
  relacionados?: ReactNode
}

// «Abrir ficha» para un vehículo; «Abrir proyecto» para un ítem (sin su proyecto, ningún enlace).
function EnlaceDeLaUnidad({ unidad }: { unidad: UnidadAbierta }) {
  const esItem = unidad.tipo === 'repuesto'
  if (esItem && unidad.proyecto === undefined) return null
  const href = esItem
    ? `${RUTAS.repuestos}/${unidad.proyecto?.id ?? ''}`
    : `${RUTAS.vehiculos}/${unidad.id}`
  return (
    <Link
      href={href as Route}
      className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-8' })}
    >
      {esItem ? 'Abrir proyecto' : 'Abrir ficha'}
    </Link>
  )
}

// La cabecera de la unidad: el título (el primer `h2` del panel: `enfocarElTituloDeLaUnidad` lo enfoca tras mover), el origen, la fase real o su insignia («Sin fase», «Sin resolver») y los días en ella.
// En un drawer es una columna suelta; en la página es una tarjeta compacta con la portada y «Relacionados» en una línea. Compatible con servidor.
export function CabeceraDeLaUnidad({
  unidad,
  origen,
  fase,
  aviso = null,
  enLaPagina = false,
  foto = null,
  relacionados = null,
}: Props) {
  const dias = textoDeDiasEnLaFase(unidad.faseDesde)
  return (
    <header
      data-slot="cabecera-de-la-unidad"
      className={
        enLaPagina
          ? 'flex min-w-0 items-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3'
          : 'grid gap-2'
      }
    >
      {foto}
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h2
            tabIndex={-1}
            className="text-(length:--text-lg) font-semibold text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus)"
          >
            {unidad.titulo}
          </h2>
          <EnlaceDeLaUnidad unidad={unidad} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
          <span>{origen}</span>
          <BadgeDeSituacion situacion={unidad.situacion} fase={fase} />
          {dias ? <span>{dias}</span> : null}
        </div>
        {aviso ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{aviso}</p> : null}
        {relacionados}
      </div>
    </header>
  )
}
