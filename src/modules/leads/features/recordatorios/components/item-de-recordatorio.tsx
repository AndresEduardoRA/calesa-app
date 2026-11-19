'use client'

import { BellIcon } from 'lucide-react'
import { fechaRelativa, formatearFechaHora } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { MasAcciones } from '@/shared/ui/lista'
import type { EstadoDelRecordatorio, Recordatorio } from '../../../entities/recordatorios'
import { nombreDelVehiculoDeNota } from '../../../entities/vehiculo-de-nota'

type Props = {
  recordatorio: Recordatorio
  estado: EstadoDelRecordatorio
  zona: string
  enCurso: boolean
  alCompletar: (completado: boolean) => void
  alEditar: () => void
  alEliminar: () => void
  // En el bloque «Seguimiento» de la ficha: una fila, con «Completar» a la vista y «Editar» y «Eliminar» en su «⋯».
  compacto?: boolean
}

// Un recordatorio: de qué es, cuándo y su estado dicho con texto (no sólo con color).
// Cuándo avisa y, si tiene uno, el vehículo (nombrado si todavía lo ve).
function CuandoYVehiculo({ recordatorio, zona }: { recordatorio: Recordatorio; zona: string }) {
  const vehiculo = nombreDelVehiculoDeNota(recordatorio)
  return (
    <p className="text-(length:--text-xs) text-(--color-ink-soft)">
      <time
        dateTime={recordatorio.recordarEn}
        title={formatearFechaHora(recordatorio.recordarEn, { zona })}
      >
        {formatearFechaHora(recordatorio.recordarEn, { zona })} ·{' '}
        {fechaRelativa(recordatorio.recordarEn, { zona })}
      </time>
      {vehiculo ? ` · ${vehiculo}` : null}
    </p>
  )
}

// El recordatorio más próximo, en una fila: de qué es y cuándo, «Vencido» con texto (y el fondo de aviso), «Completar» y su «⋯»
// (`data-mas-acciones="recordatorio-<id>"`: el modal de editar le devuelve el foco ahí).
function FilaDeRecordatorio({
  recordatorio,
  estado,
  zona,
  enCurso,
  alCompletar,
  alEditar,
  alEliminar,
}: Omit<Props, 'compacto'>) {
  const vehiculo = nombreDelVehiculoDeNota(recordatorio)
  const vencido = estado === 'vencido'
  return (
    <article
      aria-label={recordatorio.titulo}
      className={`flex min-h-14 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-(--radius-md) border py-1.5 pr-1 pl-2.5 ${
        vencido
          ? 'border-(--color-aviso) bg-(--color-aviso-soft)'
          : 'border-(--color-line) bg-(--color-surface)'
      }`}
    >
      <BellIcon aria-hidden className="size-4 shrink-0 text-(--color-ink-faint)" />
      <div className="grid min-w-0 flex-1 basis-32">
        <p className="text-(length:--text-sm) font-medium break-words text-(--color-ink)">
          {recordatorio.titulo}
        </p>
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          <time
            dateTime={recordatorio.recordarEn}
            title={formatearFechaHora(recordatorio.recordarEn, { zona })}
          >
            {fechaRelativa(recordatorio.recordarEn, { zona })}
          </time>
          {vehiculo ? ` · ${vehiculo}` : null}
        </p>
      </div>
      <div className="ml-auto flex max-w-full min-w-0 flex-wrap items-center justify-end gap-1">
        {vencido ? <Badge variant="outline">Vencido</Badge> : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-8"
          onClick={() => {
            alCompletar(true)
          }}
          disabled={enCurso}
        >
          Completar
        </Button>
        <MasAcciones
          nombre={`«${recordatorio.titulo}»`}
          id={`recordatorio-${recordatorio.id}`}
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
      </div>
    </article>
  )
}

export function ItemDeRecordatorio({ compacto = false, ...props }: Props) {
  if (compacto) {
    return <FilaDeRecordatorio {...props} />
  }
  const { recordatorio, estado, zona, enCurso, alCompletar, alEditar, alEliminar } = props
  const completado = estado === 'completado'
  return (
    <article
      aria-label={recordatorio.titulo}
      className={`grid gap-1.5 rounded-(--radius-md) border p-2.5 ${
        estado === 'vencido'
          ? 'border-(--color-aviso) bg-(--color-aviso-soft)'
          : 'border-(--color-line) bg-(--color-surface)'
      }`}
    >
      <div className="flex items-start gap-2">
        <BellIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-(--color-ink-faint)" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p
            className={`text-(length:--text-sm) font-medium break-words text-(--color-ink) ${completado ? 'line-through' : ''}`}
          >
            {recordatorio.titulo}
          </p>
          <CuandoYVehiculo recordatorio={recordatorio} zona={zona} />
        </div>
        {estado === 'vencido' ? <Badge variant="outline">Vencido</Badge> : null}
        {completado ? <Badge variant="secondary">Completado</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-7"
          onClick={() => {
            alCompletar(!completado)
          }}
          disabled={enCurso}
        >
          {completado ? 'Reabrir' : 'Completar'}
        </Button>
        {completado ? null : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 md:min-h-7"
            onClick={alEditar}
            disabled={enCurso}
            data-recordatorio-editar={recordatorio.id}
          >
            Editar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11 md:min-h-7"
          onClick={alEliminar}
          disabled={enCurso}
        >
          Eliminar
        </Button>
      </div>
    </article>
  )
}
