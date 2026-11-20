'use client'

import { COLOR_TEMA } from '@/shared/config/app'
import { tokensDeMarca } from '@/shared/lib/color'
import { Campo } from '@/shared/ui/campo'
import { validarColorDeMarca } from '../../../entities/marca'

type Props = {
  // Lo escrito: vacío = el color neutro.
  valor: string
  alCambiar: (valor: string) => void
  // El motivo que dijo el envío para este campo, si hubo.
  error?: string
}

// El color de la marca (controlado: el modal sabe qué se escribió): se tipea o se elige, y mientras tanto se ve cómo queda un botón con él.
// Si no da contraste, el motivo aparece al momento, antes de guardar.
export function CampoColor({ valor, alCambiar, error }: Props) {
  const revisado = valor.trim() === '' ? null : validarColorDeMarca(valor)
  const marca = tokensDeMarca(revisado?.ok ? revisado.color : COLOR_TEMA)

  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-2">
        <input
          type="color"
          aria-label="Selector del color"
          value={revisado?.ok ? revisado.color : COLOR_TEMA}
          // `mt-5`: arranca a la altura del campo de texto, no de su etiqueta.
          className="mt-5 h-11 w-12 shrink-0 cursor-pointer rounded-(--radius-md) border border-(--color-line-strong) bg-(--color-surface) p-1 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
          onChange={(evento) => {
            alCambiar(evento.target.value)
          }}
        />
        <div className="min-w-0 flex-1">
          <Campo
            nombre="colorAcento"
            etiqueta="Color de la marca"
            placeholder={COLOR_TEMA}
            autoComplete="off"
            spellCheck={false}
            maxLength={7}
            value={valor}
            error={revisado && !revisado.ok ? revisado.motivo : error}
            onChange={(evento) => {
              alCambiar(evento.target.value)
            }}
          />
        </div>
      </div>
      {marca.ok ? (
        <p className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-faint)">
          <span
            aria-hidden
            className="inline-flex h-8 items-center rounded-(--radius-md) px-3 font-medium"
            // El color sale de lo que se está tipeando: no es un token.
            style={{ background: marca.tokens.primario, color: marca.tokens.sobrePrimario }}
          >
            Guardar
          </span>
          Así se ven los botones. Vacío, queda el color neutro.
        </p>
      ) : null}
    </div>
  )
}
