'use client'

import { Button } from '../button'
import type { VariableDelEditor } from './tipos'

type Props = {
  variables: readonly VariableDelEditor[]
  // Las que el texto ya lleva (para marcar «Falta» en una obligatoria ausente).
  presentes: ReadonlySet<string>
  deshabilitado: boolean
  alInsertar: (clave: string) => void
}

// Un botón de variable por cada una que el texto acepta: inserta `{clave}` donde está el cursor. `onPointerDown` no le quita el foco a la
// `<textarea>` (la selección se queda donde estaba, también en el celular); el teclado entra por el clic. 44 px en el celular.
export function BotonesDeVariable({ variables, presentes, deshabilitado, alInsertar }: Props) {
  return (
    <div role="group" aria-label="Variables" className="flex flex-wrap gap-2">
      {variables.map((variable) => {
        const falta = variable.obligatoria === true && !presentes.has(variable.clave)
        return (
          <Button
            key={variable.clave}
            type="button"
            variant="outline"
            disabled={deshabilitado}
            aria-label={`Insertar ${variable.etiqueta} ({${variable.clave}})`}
            className="h-auto min-h-[44px] flex-wrap gap-x-1.5 whitespace-normal md:min-h-8"
            onPointerDown={(evento) => {
              evento.preventDefault()
            }}
            onClick={() => {
              alInsertar(variable.clave)
            }}
          >
            <span>{variable.etiqueta}</span>
            <code className="font-mono text-(length:--text-xs) text-(--color-ink-soft)">
              {`{${variable.clave}}`}
            </code>
            {falta ? (
              <span className="text-(length:--text-xs) font-medium text-(--color-peligro-ink)">
                Falta
              </span>
            ) : null}
          </Button>
        )
      })}
    </div>
  )
}
