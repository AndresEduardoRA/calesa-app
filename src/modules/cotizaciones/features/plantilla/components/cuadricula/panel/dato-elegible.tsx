'use client'

import { useId, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import type { DatoDeLaCelda } from '../../../../../entities/cuadricula-de-la-tarjeta'
import { datoQueYaNoEsta } from '../../../../../entities/plantilla/edicion/condiciones'
import { nombreDelDato } from '../../../../../entities/plantilla/edicion/frases-de-las-condiciones'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { ElegirDato } from './elegir-dato'

export const YA_NO_ESTA = 'Este dato ya no está en la fórmula: se salta.'

export const CLASE_DEL_MOTIVO = 'text-(length:--text-xs) text-(--color-peligro-ink)'

type Props = {
  // Cómo se nombra este lugar para un lector («Dato 2», «Dato de la rama 1»).
  etiqueta: string
  dato: DatoDeLaCelda | null
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  // Abierto, elige con `ElegirDato` en línea (uno a la vez en el panel: su «Qué mostrar» y su buscador no se repiten).
  abierto: boolean
  alAbrir: () => void
  alCerrar: () => void
  alElegir: (dato: DatoDeLaCelda) => void
  motivo: string | null
  // Lo que va a la derecha del nombre (el «⋯» de un dato de la lista); sin él, «Cambiar» a la vista.
  accesorio?: ReactNode
}

// Lo de arriba: el nombre del dato con lo de su derecha o, sin elegir, «Elegir el dato» con su motivo.
function Cabeza({
  dato,
  contexto,
  abierto,
  alAbrir,
  invalido,
  describe,
  accesorio,
}: Pick<Props, 'dato' | 'contexto' | 'abierto' | 'alAbrir' | 'accesorio'> & {
  invalido: boolean
  describe: string | undefined
}) {
  if (dato === null)
    return abierto ? null : (
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-0 flex-1 md:min-h-9"
          aria-invalid={invalido}
          aria-describedby={describe}
          onClick={alAbrir}
        >
          Elegir el dato
        </Button>
        {accesorio}
      </div>
    )
  return (
    <div className="flex min-h-11 min-w-0 items-center gap-2 md:min-h-8">
      <span className="min-w-0 flex-1 text-(length:--text-sm) [overflow-wrap:anywhere]">
        {nombreDelDato(dato, contexto)}
      </span>
      {accesorio ??
        (abierto ? null : (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 md:min-h-8"
            aria-describedby={describe}
            onClick={alAbrir}
          >
            Cambiar
          </Button>
        ))}
    </div>
  )
}

// Un dato de la lista de respaldo o de una rama: su nombre y, para elegirlo, el selector de «Dato» en línea con «Listo». Sin elegir, «Elegir el dato» con su motivo; si
// la fórmula ya no lo tiene, lo dice (la tarjeta lo salta).
export function DatoElegible({
  etiqueta,
  dato,
  contexto,
  nombrados,
  abierto,
  alAbrir,
  alCerrar,
  alElegir,
  motivo,
  accesorio,
}: Props) {
  const id = useId()
  const yaNoEsta = dato !== null && datoQueYaNoEsta(dato, contexto)
  const describe = [motivo === null ? null : `${id}-motivo`, yaNoEsta ? `${id}-aviso` : null]
    .filter((x) => x !== null)
    .join(' ')
  return (
    <div role="group" aria-label={etiqueta} className="grid min-w-0 gap-1">
      <Cabeza
        dato={dato}
        contexto={contexto}
        abierto={abierto}
        alAbrir={alAbrir}
        invalido={motivo !== null}
        describe={describe || undefined}
        accesorio={accesorio}
      />
      {yaNoEsta ? (
        <p id={`${id}-aviso`} className="text-(length:--text-xs) text-(--color-aviso-ink)">
          {YA_NO_ESTA}
        </p>
      ) : null}
      {motivo === null ? null : (
        <p id={`${id}-motivo`} className={CLASE_DEL_MOTIVO}>
          {motivo}
        </p>
      )}
      {abierto ? (
        <div className="grid min-w-0 gap-2 border-l-2 border-(--color-line) pl-2">
          <ElegirDato actual={dato} contexto={contexto} nombrados={nombrados} alElegir={alElegir} />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full md:min-h-9"
            onClick={alCerrar}
          >
            Listo
          </Button>
        </div>
      ) : null}
    </div>
  )
}
