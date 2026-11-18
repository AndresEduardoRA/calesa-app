'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { badgeVariants } from '@/shared/ui/badge'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { ColumnaDeComparar } from '../../../../entities/aprobada/comparar'
import { ETIQUETA_DE_VENCIDA } from '../../../../entities/aprobada/de-este-vehiculo'
import {
  ETIQUETA_DE_APROBADA,
  ETIQUETA_DE_CLASE,
} from '../../../../entities/historial-del-vehiculo'
import { MarcaDeDiferencia } from './celda-comparada'

type Columna = Extract<ColumnaDeComparar, { tipo: 'cotizacion' }>

// Lo de arriba de una columna: n.º y título, autor y fecha, la versión de la fórmula, las insignias («Aprobada» según lo que ve la página: se mueve al aprobar), y el
// total guardado con su modo, resaltado si es distinto del de la primera columna. Sin cifras en un `aria-label` ni en un `title`.
export function CabeceraDeColumna({ columna, aprobada }: { columna: Columna; aprobada: boolean }) {
  const { zonaHoraria } = useRegional()
  const insignias = [
    aprobada && { clave: 'aprobada', texto: ETIQUETA_DE_APROBADA, variant: 'secondary' as const },
    columna.final && {
      clave: 'final',
      texto: ETIQUETA_DE_CLASE.final,
      variant: 'default' as const,
    },
    columna.vencida && {
      clave: 'vencida',
      texto: ETIQUETA_DE_VENCIDA,
      variant: 'destructive' as const,
    },
  ].filter((insignia) => insignia !== false)
  const distinto = columna.total.diferencia !== 'igual'
  return (
    <div className="grid min-w-0 gap-1 text-left font-normal">
      <p className="font-semibold [overflow-wrap:anywhere] text-(--color-ink)">
        N.º {columna.numero} · {columna.titulo}
      </p>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {columna.autor} · {fechaRelativa(columna.creadoEn, { zona: zonaHoraria })} · Fórmula v
        {columna.versionDeLaFormula}
      </p>
      {insignias.length === 0 ? null : (
        <p className="flex flex-wrap gap-1">
          {insignias.map((insignia) => (
            <span
              key={insignia.clave}
              data-insignia={insignia.clave}
              className={badgeVariants({ variant: insignia.variant, className: 'shrink-0' })}
            >
              {insignia.texto}
            </span>
          ))}
        </p>
      )}
      <p
        data-total-comparado=""
        data-distinta={distinto ? '' : undefined}
        className={`rounded-(--radius-sm) text-(--color-ink) ${distinto ? 'bg-(--color-primario-soft) px-1' : ''}`}
      >
        <span className="font-semibold tabular-nums">
          {columna.total.valor === null ? (
            <span aria-label="Sin valor">—</span>
          ) : (
            <Monto valor={columna.total.valor} moneda={columna.total.moneda} />
          )}
        </span>
        <MarcaDeDiferencia diferencia={columna.total.diferencia} />
        {columna.modo === null ? null : (
          <span className="text-(length:--text-sm) text-(--color-ink-soft)"> · {columna.modo}</span>
        )}
      </p>
    </div>
  )
}
