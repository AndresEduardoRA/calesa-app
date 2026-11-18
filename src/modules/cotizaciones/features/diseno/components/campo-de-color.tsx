'use client'

import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { normalizarHex } from '../../../entities/diseno/tonos'

type Props = {
  // Sirve de `id` y de `name` del campo `#rrggbb`.
  nombre: string
  valor: string
  error: string | undefined
  alEscribir: (valor: string) => void
}

// «Color»: un selector nativo y el campo `#rrggbb`, que escriben el mismo valor (el selector sólo acepta un hex entero: a medio escribir muestra negro). El
// motivo de un hex mal escrito va debajo, enlazado con `aria-describedby`.
export function CampoDeColor({ nombre, valor, error, alEscribir }: Props) {
  const idError = error ? `${nombre}-error` : undefined
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={nombre}>Color</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Color, selector"
          className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-(--color-line) bg-transparent p-1 md:h-9"
          value={normalizarHex(valor) ?? '#000000'}
          onChange={(evento) => {
            alEscribir(evento.target.value)
          }}
        />
        <Input
          id={nombre}
          name={nombre}
          autoComplete="off"
          spellCheck={false}
          placeholder="#rrggbb"
          maxLength={20}
          className="h-11 max-w-40 font-mono md:h-9"
          aria-invalid={error ? true : undefined}
          aria-describedby={idError}
          value={valor}
          onChange={(evento) => {
            alEscribir(evento.target.value)
          }}
        />
      </div>
      {error ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}
