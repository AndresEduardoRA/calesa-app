'use client'

import { useId } from 'react'
import {
  CIFRAS_DE_EJEMPLO,
  motivoSinCotizacion,
  nombreDeLaReferencia,
} from '../../../../entities/plantilla/referencia-del-lienzo'
import type { ReferenciaDeLaTarjeta } from '../../../../entities/referencia-de-la-tarjeta'
import { CLASE_DE_LA_ELECCION } from './panel/eleccion'

type Props = {
  referencia: ReferenciaDeLaTarjeta
  ejemplo: boolean
  origen: string
  alElegir: (ejemplo: boolean) => void
}

// «Referencia:» del lienzo: la cotización más reciente del origen que quien configura ve (dibujada con lo guardado, como el PDF) o las cifras de ejemplo. Sin cotización
// (o si no se leyó), sólo las cifras de ejemplo, y lo dice.
export function SelectorDeReferencia({ referencia, ejemplo, origen, alElegir }: Props) {
  const id = useId()
  const motivo = motivoSinCotizacion(referencia, origen)
  const conCotizacion = referencia.estado === 'cotizacion'
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <label htmlFor={id} className="text-(length:--text-sm) text-(--color-ink-soft)">
        Referencia:
      </label>
      <select
        id={id}
        className={`${CLASE_DE_LA_ELECCION} max-w-full`}
        value={conCotizacion && !ejemplo ? 'cotizacion' : 'ejemplo'}
        disabled={!conCotizacion}
        aria-describedby={motivo === null ? undefined : `${id}-motivo`}
        onChange={(e) => {
          alElegir(e.target.value === 'ejemplo')
        }}
        data-referencia-del-lienzo=""
      >
        {conCotizacion ? (
          <option value="cotizacion">{nombreDeLaReferencia(referencia)}</option>
        ) : null}
        <option value="ejemplo">{CIFRAS_DE_EJEMPLO}</option>
      </select>
      {motivo === null ? null : (
        <p
          id={`${id}-motivo`}
          className="basis-full text-(length:--text-xs) text-(--color-ink-soft)"
        >
          {motivo}
        </p>
      )}
    </div>
  )
}
