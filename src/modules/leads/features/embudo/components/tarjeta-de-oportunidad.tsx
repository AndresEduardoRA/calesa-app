'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { fechaRelativa } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import {
  CLASES_DE_VISTO,
  EsquinaDeAcciones,
  SufijoDeVisto,
  useVistoDeLista,
} from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { EtapaGuardada } from '../../../entities/embudo'
import { CLAVE_DE_SECCION } from '../../../entities/ficha'
import type { Tarjeta } from '../../../entities/tablero'
import { rotuloDeVehiculoDeNota } from '../../../entities/vehiculo-de-nota'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import { InsigniaDeEstado } from '../../oportunidades/components/insignia-de-estado'
import { MenuMoverA } from '../../oportunidades/components/menu-mover-a'
import { MenuDeLeadDeLaTarjeta } from './menu-de-lead-del-embudo'

type Props = {
  tarjeta: Tarjeta
  etapas: readonly EtapaGuardada[]
  enCurso: boolean
  alMover: (etapaId: string, motivo: string | null) => Promise<boolean>
  alPedirMotivo: (etapa: EtapaGuardada) => void
}

// Una oportunidad en el kanban: título, de qué lead (lleva a su sección en la ficha, y es lo que marca «visto»: la ficha del lead se registra en el módulo leads), monto, vehículo,
// desde cuándo está en la etapa y «Mover a…». Ganada o perdida lo dice con texto. El «⋯» del lead va arriba a la derecha, en su esquina
// (una segunda columna de la grilla, sólo en la fila del título), como en toda tarjeta de la lista.
export function TarjetaDeOportunidad({ tarjeta, etapas, enCurso, alMover, alPedirMotivo }: Props) {
  const { zonaHoraria } = useRegional()
  const visto = useVistoDeLista(tarjeta.lead.id)
  const href = `${RUTAS.leads}/${tarjeta.lead.id}?${CLAVE_DE_SECCION}=oportunidades` as Route
  return (
    <article
      aria-label={tarjeta.titulo}
      data-visto={visto ?? undefined}
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 ${CLASES_DE_VISTO}`}
    >
      <div className="col-start-1 row-start-1 flex items-start justify-between gap-2">
        <h3 className="text-(length:--text-sm) font-medium break-words text-(--color-ink)">
          {tarjeta.titulo}
        </h3>
        {tarjeta.estado === 'abierta' ? null : <InsigniaDeEstado estado={tarjeta.estado} />}
      </div>
      <EsquinaDeAcciones className="col-start-2 row-start-1 -mt-3 -mr-3">
        <MenuDeLeadDeLaTarjeta lead={tarjeta.lead} />
      </EsquinaDeAcciones>
      <Link
        href={href}
        className="col-span-2 flex w-fit max-w-full items-baseline gap-1 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:underline"
      >
        {/* Un nombre sin espacios no se parte: se corta con «…» y el número queda a la vista. */}
        <span data-abre-resumen="" className="min-w-0 truncate">
          {tarjeta.lead.nombre}
        </span>
        <NumeroDeLead numeros={tarjeta.lead.numeros} />
        <SufijoDeVisto id={tarjeta.lead.id} />
      </Link>
      {tarjeta.monto === null && !tarjeta.vehiculo ? null : (
        <dl className="col-span-2 grid grid-cols-[minmax(0,1fr)] gap-0.5 text-(length:--text-xs) text-(--color-ink-soft)">
          {tarjeta.monto === null ? null : (
            <div className="flex gap-1">
              <dt className="sr-only">Monto estimado</dt>
              <dd>
                <Monto
                  valor={tarjeta.monto}
                  moneda={tarjeta.moneda}
                  className="text-(--color-ink)"
                />
              </dd>
            </div>
          )}
          {tarjeta.vehiculo ? (
            <div className="flex gap-1">
              <dt className="sr-only">Vehículo</dt>
              <dd className="truncate">{rotuloDeVehiculoDeNota(tarjeta.vehiculo)}</dd>
            </div>
          ) : null}
        </dl>
      )}
      {tarjeta.estado === 'perdida' && tarjeta.motivoPerdida ? (
        <p className="col-span-2 text-(length:--text-xs) text-(--color-ink-soft)">
          Motivo: {tarjeta.motivoPerdida}
        </p>
      ) : null}
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 text-(length:--text-xs) text-(--color-ink-faint)">
          En esta etapa desde {fechaRelativa(tarjeta.enEtapaDesde, { zona: zonaHoraria })}
        </span>
        <MenuMoverA
          id={tarjeta.id}
          titulo={tarjeta.titulo}
          etapas={etapas}
          actual={tarjeta.etapaId}
          enCurso={enCurso}
          alMover={alMover}
          alPedirMotivo={alPedirMotivo}
        />
      </div>
    </article>
  )
}
