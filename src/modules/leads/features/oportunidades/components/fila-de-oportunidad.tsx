'use client'

import { Monto } from '@/shared/ui/monto'
import type { EtapaGuardada } from '../../../entities/embudo'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import { InsigniaDeEtiqueta } from '../../etiquetas/components/insignia-de-etiqueta'
import { MenuDeOportunidad } from './menu-de-oportunidad'

type Props = {
  oportunidad: OportunidadDelLead
  // Las etapas de su embudo (para «Mover a») y si hay que nombrar el embudo (quien mira tiene más de uno).
  etapas: readonly EtapaGuardada[]
  nombrarEmbudo: boolean
  // Cartera y `leads.editar`: sin esto, la fila va sin «⋯».
  puedeEditar: boolean
  ocupada: boolean
  alMover: (etapa: EtapaGuardada, motivo: string | null) => Promise<boolean>
  alPedirMotivo: (etapa: EtapaGuardada) => void
  alEditar: () => void
  alEliminar: () => void
}

// Una oportunidad abierta en una línea: el título (cortado, entero al pasar el puntero), el embudo si quien mira tiene más de uno, la
// etapa con su color y su nombre, el monto (sin monto, nada) y su «⋯». No es un enlace: lo que se hace con ella está en su «⋯».
export function FilaDeOportunidad({
  oportunidad: o,
  etapas,
  nombrarEmbudo,
  puedeEditar,
  ...acciones
}: Props) {
  return (
    <article aria-label={o.titulo} className="flex min-h-11 min-w-0 items-center gap-2 md:min-h-9">
      <p
        title={o.titulo}
        className="min-w-0 flex-1 truncate text-(length:--text-sm) font-medium text-(--color-ink)"
      >
        {o.titulo}
      </p>
      {nombrarEmbudo ? (
        <span className="max-w-28 min-w-0 shrink truncate text-(length:--text-xs) text-(--color-ink-faint)">
          {o.embudo.nombre}
        </span>
      ) : null}
      <InsigniaDeEtiqueta
        etiqueta={{ nombre: o.etapa.nombre, color: o.etapa.color }}
        className="max-w-28 shrink-0"
      />
      {o.monto === null ? null : (
        <Monto
          valor={o.monto}
          moneda={o.moneda}
          className="shrink-0 text-(length:--text-sm) text-(--color-ink) tabular-nums"
        />
      )}
      {puedeEditar ? (
        <MenuDeOportunidad
          id={o.id}
          titulo={o.titulo}
          etapas={etapas}
          actual={o.etapaId}
          {...acciones}
        />
      ) : null}
    </article>
  )
}
