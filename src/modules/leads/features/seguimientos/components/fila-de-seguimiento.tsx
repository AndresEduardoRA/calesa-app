'use client'

import { EyeIcon } from 'lucide-react'
import { formatearFechaHora, fechaRelativa } from '@/shared/lib/fechas'
import { IconoDelCatalogo } from '@/shared/ui/icono-del-catalogo/icono-del-catalogo'
import { MasAcciones } from '@/shared/ui/lista'
import { autorDe, ETIQUETA_DE_VISIBLE, type Seguimiento } from '../../../entities/seguimiento'
import { nombreDelVehiculoDeNota } from '../../../entities/vehiculo-de-nota'
import { DocumentoDeSeguimiento } from './documento-de-seguimiento'

type Props = {
  seguimiento: Seguimiento
  zona: string
  // Mío y con el lead en la cartera: «Editar» y «Eliminar» en su «⋯».
  editable: boolean
  enCurso: boolean
  alEditar: () => void
  alEliminar: () => void
}

// El «⋯» de un seguimiento propio: «Editar» (abre el modal cuando el menú terminó de cerrarse) y «Eliminar» (con «Deshacer»).
function MasDeLaFila({
  seguimiento,
  enCurso,
  alEditar,
  alEliminar,
}: Pick<Props, 'seguimiento' | 'enCurso' | 'alEditar' | 'alEliminar'>) {
  return (
    <MasAcciones
      nombre={`«${seguimiento.titulo}»`}
      id={`seguimiento-${seguimiento.id}`}
      acciones={[
        {
          tipo: 'accion',
          clave: 'editar',
          etiqueta: 'Editar',
          deshabilitada: enCurso,
          despuesDeCerrar: true,
          alElegir: alEditar,
        },
        {
          tipo: 'accion',
          clave: 'eliminar',
          etiqueta: 'Eliminar',
          deshabilitada: enCurso,
          destructiva: true,
          alElegir: alEliminar,
        },
      ]}
    />
  )
}

// Un seguimiento en la línea de tiempo del bloque «Seguimiento»: el icono de su tipo en un círculo sobre la línea, el título,
// «Llamada · hace 2 h · Ana · <vehículo>» (el nombre del tipo a la vista: un tipo sin icono, o desactivado, sigue nombrando a los suyos), el ojo
// si lo ve el cliente y dos líneas del detalle.
// Lo que se hace con él, en su «⋯» (`data-mas-acciones="seguimiento-<id>"`: el modal de editar le devuelve el foco ahí). El `<li>` y la línea
// vertical los pone la lista.
export function FilaDeSeguimiento({
  seguimiento,
  zona,
  editable,
  enCurso,
  alEditar,
  alEliminar,
}: Props) {
  const vehiculo = nombreDelVehiculoDeNota(seguimiento)
  return (
    <article
      aria-label={seguimiento.titulo}
      className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3"
    >
      <span
        aria-hidden
        className="relative z-[1] flex size-8 items-center justify-center rounded-full border border-(--color-line) bg-(--color-surface) text-(--color-ink-soft)"
      >
        <IconoDelCatalogo clave={seguimiento.tipoIcono} className="size-4" />
      </span>
      <div className="grid min-w-0 gap-0.5">
        <div className="flex min-w-0 items-start gap-1">
          <h3 className="min-w-0 grow pt-1.5 text-(length:--text-sm) font-medium break-words text-(--color-ink)">
            {seguimiento.titulo}
          </h3>
          {seguimiento.visibilidad === 'publico' ? (
            <span
              title={ETIQUETA_DE_VISIBLE}
              className="flex size-8 shrink-0 items-center justify-center text-(--color-ink-faint)"
            >
              <EyeIcon aria-hidden className="size-4" />
              <span className="sr-only">{ETIQUETA_DE_VISIBLE}</span>
            </span>
          ) : null}
          {editable ? (
            <MasDeLaFila
              seguimiento={seguimiento}
              enCurso={enCurso}
              alEditar={alEditar}
              alEliminar={alEliminar}
            />
          ) : null}
        </div>
        <p className="text-(length:--text-xs) text-(--color-ink-faint)">
          <span className="text-(--color-ink-soft)">{seguimiento.tipoNombre}</span>
          {' · '}
          <time
            dateTime={seguimiento.ocurridoEn}
            title={formatearFechaHora(seguimiento.ocurridoEn, { zona })}
          >
            {fechaRelativa(seguimiento.ocurridoEn, { zona })}
          </time>
          {' · '}
          {autorDe(seguimiento)}
          {vehiculo ? ` · ${vehiculo}` : null}
        </p>
        <div className="line-clamp-2 text-(length:--text-sm) text-(--color-ink-soft)">
          <DocumentoDeSeguimiento
            documento={seguimiento.detalleDoc}
            texto={seguimiento.detalleTexto}
          />
        </div>
      </div>
    </article>
  )
}
