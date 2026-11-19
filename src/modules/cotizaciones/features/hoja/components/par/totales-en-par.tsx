'use client'

import { Monto } from '@/shared/ui/monto'
import { totalDelResumen, type ContextoDeHoja } from '../../../../entities/binding'
import type { HojaLista } from '../../../../entities/hoja'
import { rotuloEnPar, type ParDeHoja } from '../../../../entities/hoja-en-par'
import { MONEDA_DEL_PRIMER_RESULTADO } from '../../../../entities/primer-resultado'
import type { EstadoDeRecalculo } from '../../../../entities/recalculo'
import { AvisoDeFallo, AvisosDelTotal } from '../partes-del-resumen'
import { TotalEnMonedaLocal } from '../total-en-moneda-local'

type Columna = { contexto: ContextoDeHoja; estado: EstadoDeRecalculo; alReintentar: () => void }

// Los dos totales del resumen de una hoja en par (glosario: «Variante en par»): cada uno con su opción («Total · 20 pies»), su valor por `<Monto>`, el de la moneda
// local si se pidió, sus avisos y, si su recálculo falló, su «Reintentar» (la otra columna sigue).
export function TotalesEnPar({
  tarjeta,
  par,
  columnas,
  monedaDelTotalBs,
  alRecargar,
}: {
  tarjeta: HojaLista['tarjetaTotal']
  par: ParDeHoja
  columnas: readonly [Columna, Columna]
  monedaDelTotalBs: string | null
  alRecargar: () => void
}) {
  return (
    <div className="grid gap-3">
      {columnas.map((columna, lado) => {
        const opcion = par.opciones[lado === 0 ? 0 : 1]
        const total = totalDelResumen(columna.contexto)
        return (
          <div key={opcion.clave} className="grid gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-(length:--text-sm) font-medium [overflow-wrap:anywhere] text-(--color-ink-soft)">
                {rotuloEnPar(tarjeta.etiqueta, opcion)}
              </span>
              <strong
                data-total=""
                data-opcion={opcion.clave}
                className="text-(length:--text-xl) font-semibold text-(--color-ink) tabular-nums"
              >
                {total.tipo === 'valor' ? (
                  <Monto valor={total.usd} moneda={MONEDA_DEL_PRIMER_RESULTADO} />
                ) : (
                  '—'
                )}
              </strong>
            </div>
            {monedaDelTotalBs === null ? null : (
              <TotalEnMonedaLocal
                respuesta={columna.contexto.respuesta}
                moneda={monedaDelTotalBs}
              />
            )}
            <AvisosDelTotal total={total} estado={columna.estado} variante={undefined} />
            <AvisoDeFallo
              estado={columna.estado}
              alReintentar={columna.alReintentar}
              alRecargar={alRecargar}
            />
          </div>
        )
      })}
    </div>
  )
}
