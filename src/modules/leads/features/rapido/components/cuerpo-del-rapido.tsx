'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import type { FilaDeLead } from '../../../entities/listado'
import { OrigenDelLead } from '../../listado/components/origen-del-lead'
import { origenDelCatalogo, type DatosDeLaLista } from '../../listado/components/tipos'
import {
  RecordatorioDeFila,
  UltimoSeguimientoDeFila,
  useContextoDeUltimoContacto,
  type DatosDeUltimoContacto,
} from '../../listado/components/ultimo-contacto'
import { TelefonosDelResumenDiferido } from './diferidos'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="min-w-0 text-(length:--text-sm) text-(--color-ink)">{children}</dd>
    </div>
  )
}

export function EsqueletoDelRapido({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta} className="grid gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export type PropsDeDatos = DatosDeLaLista & { lead: FilaDeLead }

// Lo que el resumen necesita para los teléfonos: qué tan al día están (`revision`; los extras se editan en el panel de edición).
export type ParaLosTelefonos = {
  revision: number
}

function OrigenDeLaLinea({ origen }: { origen: ReturnType<typeof origenDelCatalogo> }) {
  return origen ? (
    <OrigenDelLead nombre={origen.nombre} icono={origen.icono ?? null} activo={origen.activo} />
  ) : (
    '—'
  )
}

type PropsDelCuerpo = PropsDeDatos & {
  fallo: boolean
  reintentar: () => void
  telefonos: ParaLosTelefonos
  // Los tipos de seguimiento y el instante de la página: lo mismo que usan las filas para «hace 3 días».
  ultimoContacto: DatosDeUltimoContacto
}

// Lo que se sabe del lead de un vistazo: el teléfono (como lo entrega la base), de dónde vino y lo último que pasó (el último seguimiento y
// el próximo recordatorio de quien mira, los mismos de la fila, sin otra lectura). Los campos del layout y el alta son de la ficha.
export function CuerpoDelRapido({
  fallo,
  reintentar,
  telefonos,
  ultimoContacto,
  ...datos
}: PropsDelCuerpo) {
  const { lead, origenes } = datos
  const contexto = useContextoDeUltimoContacto(ultimoContacto)
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-3">
        <Dato etiqueta="Teléfono">
          <TelefonosDelResumenDiferido leadId={lead.id} {...telefonos} />
        </Dato>
        <Dato etiqueta="Origen del lead">
          <OrigenDeLaLinea origen={origenDelCatalogo(origenes, lead.origenId)} />
        </Dato>
        <Dato etiqueta="Último seguimiento">
          <UltimoSeguimientoDeFila lead={lead} contexto={contexto} />
        </Dato>
        <Dato etiqueta="Recordatorio">
          <RecordatorioDeFila lead={lead} contexto={contexto} />
        </Dato>
      </dl>
      {fallo ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No se pudieron actualizar los datos.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  )
}
