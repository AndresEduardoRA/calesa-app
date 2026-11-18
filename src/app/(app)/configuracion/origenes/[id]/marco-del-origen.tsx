import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { integracionActiva } from '@/modules/empresa'
import type { Permisos } from '@/modules/equipo'
import { pasosDe, type OrigenConUso } from '@/modules/origenes'
import { ETIQUETA_DE_TIPO_DE_ORIGEN } from '@/modules/origenes/client'
import { SiguientesPasos } from '@/modules/origenes/pantallas/origen'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { conDestino } from '../pasos'
import { subseccionDeOrigen, type ParteDelOrigen } from '../subsecciones'

type Props = {
  origen: OrigenConUso
  permisos: Permisos
  parte: ParteDelOrigen
  children: ReactNode
}

// Lo común a las partes de un origen: la vuelta a la lista, el nombre como título con su tipo y su estado, la frase de la parte que se ve
// y lo que le falta para funcionar. El salto entre partes lo dan el menú de Configuración y, donde no se ve, el selector de sección.
export async function MarcoDelOrigen({ origen, permisos, parte, children }: Props) {
  const apibaraActiva = origen.tipo === 'subasta' ? await integracionActiva('apibara') : false
  const pasos = conDestino(pasosDe(origen, { apibaraActiva }), permisos, origen.id)
  return (
    <div className="grid max-w-3xl gap-4">
      <Link
        href={RUTAS.origenes as Route}
        className="inline-flex w-fit items-center gap-1 text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink)"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Orígenes
      </Link>
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="size-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: origen.color }}
          />
          <h1 className="min-w-0 text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
            {origen.nombre}
          </h1>
          <Badge variant="secondary">{ETIQUETA_DE_TIPO_DE_ORIGEN[origen.tipo]}</Badge>
          {origen.activo ? null : <Badge variant="outline">Inactivo</Badge>}
        </div>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {subseccionDeOrigen(parte).descripcion}
        </p>
      </div>
      <SiguientesPasos nombre={origen.nombre} pasos={pasos} />
      {children}
    </div>
  )
}
