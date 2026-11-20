'use client'

import {
  NOMBRE_DE_PLATAFORMA,
  PLATAFORMAS_APIBARA,
  type PlataformaApibara,
} from '@/shared/lib/apibara'

type Props = {
  elegidas: readonly PlataformaApibara[]
  alCambiar: (elegidas: readonly PlataformaApibara[]) => void
  error: string | undefined
  deshabilitado: boolean
}

// Las plataformas de subasta que apibara consulta: casillas en el modal de apibara.
export function PlataformasDeApibara({ elegidas, alCambiar, error, deshabilitado }: Props) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        Plataformas
      </legend>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {PLATAFORMAS_APIBARA.map((plataforma) => (
          <label
            key={plataforma}
            className="flex min-h-11 cursor-pointer items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:min-h-8"
          >
            <input
              type="checkbox"
              className="size-4 accent-(--color-primario)"
              checked={elegidas.includes(plataforma)}
              disabled={deshabilitado}
              onChange={(evento) => {
                alCambiar(
                  evento.target.checked
                    ? [...elegidas, plataforma]
                    : elegidas.filter((una) => una !== plataforma),
                )
              }}
            />
            {NOMBRE_DE_PLATAFORMA[plataforma]}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
