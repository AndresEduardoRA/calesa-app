'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Aviso } from '@/shared/ui/aviso'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Skeleton } from '@/shared/ui/skeleton'
import type { EstadoDeOportunidad } from '../../../entities/oportunidad'
import {
  rutaDeLasOportunidadesDe,
  type AvisoDeOportunidades,
} from '../../../entities/oportunidad-rapida'
import type { LecturaDelAviso } from '../hooks/use-aviso-de-oportunidades'
import { InsigniaDeEstado } from './insignia-de-estado'

type Props = {
  abierto: boolean
  alCerrar: () => void
  leadId: string
  nombreDelLead: string
  lectura: Exclude<LecturaDelAviso, { tipo: 'sin_oportunidades' }>
  reintentar: () => void
  // «Crear igual»: sigue al formulario.
  alSeguir: () => void
  focoAlCerrar: () => HTMLElement | boolean
}

function Lista({ leadId, aviso }: { leadId: string; aviso: AvisoDeOportunidades }) {
  return (
    <div className="grid gap-2">
      <ul className="grid gap-2">
        {aviso.mostradas.map((o) => (
          <li
            key={o.id}
            className="flex min-w-0 items-center justify-between gap-2 rounded-(--radius-md) border border-(--color-border) px-3 py-2"
          >
            <span className="grid min-w-0 gap-1">
              <span className="text-(length:--text-sm) font-medium [overflow-wrap:anywhere] text-(--color-ink)">
                {o.titulo}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-(length:--text-xs) text-(--color-ink-soft)">
                {o.etapa.nombre}
                <InsigniaDeEstado estado={o.estado as EstadoDeOportunidad} />
              </span>
            </span>
            <Link
              href={rutaDeLasOportunidadesDe(leadId, o.id) as Route}
              aria-label={`Ver «${o.titulo}»`}
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'min-h-11 shrink-0 md:min-h-7',
              })}
            >
              Ver
            </Link>
          </li>
        ))}
      </ul>
      {aviso.resto ? (
        <p className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
          {aviso.resto}
          <Link
            href={rutaDeLasOportunidadesDe(leadId) as Route}
            className="text-(--color-ink) underline underline-offset-2"
          >
            Ver todas
          </Link>
        </p>
      ) : null}
    </div>
  )
}

// Antes del formulario de «Nueva oportunidad…»: lo que el lead ya tiene (las que quien mira ve; nunca las ajenas) para no crear sin saberlo. «Crear igual» sigue
// al formulario y «Cancelar» cierra. Mientras se lee, un esqueleto; si la lectura falla lo dice con «Reintentar» y «Crear igual» sigue ahí: no poder
// leer no impide crear.
export function AvisoDeOportunidadesDelLead({
  abierto,
  alCerrar,
  leadId,
  nombreDelLead,
  lectura,
  reintentar,
  alSeguir,
  focoAlCerrar,
}: Props) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nueva oportunidad"
      descripcion={
        lectura.tipo === 'con_oportunidades'
          ? `«${nombreDelLead}» ya tiene oportunidades. Revisa si alguna sirve antes de crear otra.`
          : `Sobre «${nombreDelLead}».`
      }
      focoAlCerrar={focoAlCerrar}
      pie={
        <>
          <Button variant="ghost" onClick={alCerrar}>
            Cancelar
          </Button>
          {lectura.tipo === 'leyendo' ? null : <Button onClick={alSeguir}>Crear igual</Button>}
        </>
      }
    >
      {lectura.tipo === 'leyendo' ? (
        <div aria-busy="true" aria-label="Cargando las oportunidades" className="grid gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}
      {lectura.tipo === 'error' ? (
        <Aviso tono="peligro">
          <div>
            <p>No pudimos ver las oportunidades de este lead.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 min-h-11 md:min-h-7"
              onClick={reintentar}
            >
              Reintentar
            </Button>
          </div>
        </Aviso>
      ) : null}
      {lectura.tipo === 'con_oportunidades' ? (
        <Lista leadId={leadId} aviso={lectura.aviso} />
      ) : null}
    </Modal>
  )
}
