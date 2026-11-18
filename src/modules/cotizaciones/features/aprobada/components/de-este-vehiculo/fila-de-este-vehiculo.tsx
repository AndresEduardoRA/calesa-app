'use client'

import { cn } from 'cn'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import {
  tituloDeLaFila,
  type FilaDeEsteVehiculo as Fila,
} from '../../../../entities/aprobada/de-este-vehiculo'
import { AccionesDeLaFila } from './acciones-de-la-fila'
import { InsigniasDeLaFila } from './insignias-de-la-fila'

type Props = {
  fila: Fila
  tituloDelVehiculo: string | null
  // Es la cotización que se está mirando: «Esta», sin «Abrir».
  esta: boolean
  motivo: string | null
  aprobando: boolean
  ocupado: boolean
  alAprobar: () => void
}

// Una fila de «De este vehículo»: n.º y título, insignias, total con su modo, autor y fecha, y las acciones. La aprobada lleva un borde de acento. En escritorio, las
// acciones a la derecha; angosto o al 200 %, todo en una columna. Sin cifras en un `aria-label` ni en un `title` (Modo Live: el total va con `<Monto>`).
export function FilaDeEsteVehiculo({ fila, tituloDelVehiculo, esta, ...acciones }: Props) {
  const { zonaHoraria } = useRegional()
  const titulo = tituloDeLaFila(fila, tituloDelVehiculo)
  return (
    <li
      data-de-este-vehiculo=""
      data-aprobada={fila.aprobada ? '' : undefined}
      data-esta={esta ? '' : undefined}
      className={cn(
        'grid min-w-0 gap-3 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) p-3 @lg/de-este:grid-cols-[minmax(0,1fr)_auto]',
        fila.aprobada && 'border-l-4 border-l-(--color-primario)',
      )}
    >
      {/* T311: la casilla de comparar va aquí (conCasillas). */}
      <div className="grid min-w-0 gap-1">
        <p className="min-w-0 font-medium [overflow-wrap:anywhere] text-(--color-ink)">
          N.º {fila.numero} · <span title={titulo}>{titulo}</span>
        </p>
        <InsigniasDeLaFila fila={fila} esta={esta} />
        <p className="text-(length:--text-sm) text-(--color-ink)">
          <Monto valor={fila.totalBase} moneda={fila.monedaMostrar ?? undefined} />
          {fila.modo === null ? null : ` · ${fila.modo}`}
        </p>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {fila.autor} · {fechaRelativa(fila.creadoEn, { zona: zonaHoraria })}
        </p>
      </div>
      <AccionesDeLaFila id={fila.id} aprobada={fila.aprobada} esta={esta} {...acciones} />
    </li>
  )
}
