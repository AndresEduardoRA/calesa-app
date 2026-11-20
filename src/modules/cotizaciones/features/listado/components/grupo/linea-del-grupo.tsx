'use client'

import type { MouseEvent, ReactNode } from 'react'
import { esClicPropio } from '@/shared/lib/clic-de-fila'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import {
  ETIQUETA_DE_APROBADA,
  ETIQUETA_DE_CLASE,
} from '../../../../entities/historial-del-vehiculo'
import type { LineaDelGrupo as Linea } from '../../../../entities/listado/grupos-del-listado'
import {
  tituloAparteDelNumero,
  tituloDeLaCotizacion,
} from '../../../../entities/titulo-de-la-cotizacion'
import { InsigniaPrivada } from '../../../privada/components/insignia-privada'
import { Vigencia } from '../vigencia'

type Props = {
  linea: Linea
  // Es la aprobada de su vehículo (la cabeza del grupo, si quien mira la ve): va primera y lleva su insignia.
  aprobada: boolean
  // La casilla de «Comparar» (del hueco), o nada.
  casilla?: ReactNode
  alAbrir: (id: string) => void
}

// Una cotización del modal de un grupo, compacta (`docs/DECISIONES.md`): la casilla, «N.º n» con su título en una línea, «Aprobada» y «Final», el total con su modo, quién y
// cuándo y la vigencia. Sin cliente ni «⋯» (son las de un mismo vehículo; sus acciones están arriba del resumen). El clic abre su resumen, salvo la casilla.
export function LineaDelGrupo({ linea, aprobada, casilla, alAbrir }: Props) {
  const { zonaHoraria } = useRegional()
  // Las de un grupo son del mismo vehículo: sólo su título propio (el del vehículo ya está en la tarjeta).
  const titulo = tituloAparteDelNumero(tituloDeLaCotizacion({ ...linea, vehiculo: null }))
  const abrir = (evento: MouseEvent<HTMLDivElement>) => {
    if (!esClicPropio(evento)) {
      alAbrir(linea.id)
    }
  }
  return (
    <div
      data-linea-del-grupo={linea.id}
      className="flex min-w-0 cursor-pointer items-start gap-2 rounded-(--radius-md) px-2 py-1.5 hover:bg-(--color-surface-2)"
      onClick={abrir}
    >
      {casilla ? <div data-no-abre="">{casilla}</div> : null}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            className="shrink-0 font-medium text-(--color-ink) tabular-nums underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
            aria-label={`Abrir N.º ${String(linea.numero)}`}
            onClick={() => {
              alAbrir(linea.id)
            }}
          >
            N.º {linea.numero}
          </button>
          {titulo === null ? null : (
            <span title={titulo} className="truncate text-(length:--text-sm) text-(--color-ink)">
              {titulo}
            </span>
          )}
          {aprobada ? <Badge variant="secondary">{ETIQUETA_DE_APROBADA}</Badge> : null}
          {linea.privada ? <InsigniaPrivada /> : null}
          {linea.clase === 'final' ? (
            <Badge variant="secondary">{ETIQUETA_DE_CLASE.final}</Badge>
          ) : null}
        </p>
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-(length:--text-xs) text-(--color-ink-soft)">
          <span className="font-medium text-(--color-ink) tabular-nums">
            <Monto valor={linea.totalBase} />
          </span>
          {linea.modo === null ? null : <span className="truncate">{linea.modo}</span>}
          <span className="truncate">
            {linea.autor} · {fechaRelativa(linea.creadoEn, { zona: zonaHoraria })}
          </span>
          <Vigencia venceEl={linea.venceEl} vencida={linea.vencida} />
        </p>
      </div>
    </div>
  )
}
