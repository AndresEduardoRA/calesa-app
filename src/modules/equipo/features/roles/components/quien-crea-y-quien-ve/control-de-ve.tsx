'use client'

import { useId } from 'react'
import { ETIQUETA_DE_VE, VALORES_DE_VE, type Ve } from '../../../../entities/cuadro-de-cotizaciones'
import type { RolDelCuadro } from './tipos'

type Props = RolDelCuadro & { alCambiar: (ve: Ve) => void }

// «Ve»: los cuatro escalones en un `<select>` nativo (el selector del sistema, cómodo con el dedo). Lo que no se puede elegir queda apagado y el
// porqué va debajo: un `<option>` no dibuja ayuda. Sólo lectura, el escalón en texto.
export function ControlDeVe({ rol, fila, ocupado, alCambiar }: Props) {
  const id = useId()
  if (fila.sinCambiar) {
    return (
      <span className="text-(length:--text-sm) text-(--color-ink)">
        {ETIQUETA_DE_VE[fila.celda.ve]}
      </span>
    )
  }
  const motivos = [...new Set(fila.opciones.flatMap((opcion) => opcion.motivo ?? []))]
  return (
    <div className="grid min-w-0 gap-1">
      <select
        aria-label={`Ve: ${rol.nombre}`}
        aria-describedby={motivos.length > 0 ? id : undefined}
        className="h-11 w-full min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2.5 text-(length:--text-sm) text-(--color-ink) disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:w-60"
        value={fila.celda.ve}
        disabled={ocupado}
        onChange={(evento) => {
          const elegido = VALORES_DE_VE.find((valor) => valor === evento.target.value)
          if (elegido) alCambiar(elegido)
        }}
      >
        {fila.opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor} disabled={opcion.motivo !== null}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
      {motivos.length > 0 ? (
        <div id={id} className="grid gap-0.5 text-(length:--text-xs) text-(--color-ink-faint)">
          {motivos.map((motivo) => (
            <p key={motivo} className="md:max-w-60">
              {motivo}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
