'use client'

import { cn } from 'cn'
import { useRef, type Ref, type UIEvent } from 'react'
import { TextoConVariables } from './texto-con-variables'

// La caja de la `<textarea>` y la de su espejo, **una sola constante**: si difieren en letra, interlineado, relleno, borde, ajuste o barra de
// desplazamiento, las pastillas se corren del texto. `text-base` en el celular (menos de 16 px hace que iOS acerque la página al enfocar).
const CAJA =
  'block h-52 w-full min-w-0 rounded-lg border px-2.5 py-2 font-sans text-base leading-6 break-words whitespace-pre-wrap md:text-sm [scrollbar-gutter:stable]'

type Props = {
  id: string
  valor: string
  claves: readonly string[]
  deshabilitado: boolean
  largoMaximo: number
  conAviso: boolean
  describedBy: string
  areaRef: Ref<HTMLTextAreaElement>
  alEscribir: (texto: string) => void
  alMoverLaSeleccion: () => void
}

// El campo: un espejo que dibuja el texto con las variables como pastillas y, encima, la `<textarea>` con el texto transparente y el cursor
// visible. El desplazamiento de la una se copia al otro.
export function CajaConEspejo({
  id,
  valor,
  claves,
  deshabilitado,
  largoMaximo,
  conAviso,
  describedBy,
  areaRef,
  alEscribir,
  alMoverLaSeleccion,
}: Props) {
  const espejoRef = useRef<HTMLDivElement>(null)
  function alDesplazar(evento: UIEvent<HTMLTextAreaElement>) {
    if (espejoRef.current) {
      espejoRef.current.scrollTop = evento.currentTarget.scrollTop
    }
  }
  return (
    <div className="focus-within:ring-ring relative h-52 rounded-lg bg-(--color-surface) focus-within:ring-3">
      <div
        ref={espejoRef}
        aria-hidden
        data-espejo
        className={cn(
          CAJA,
          'absolute inset-0 overflow-hidden border-transparent text-(--color-ink)',
        )}
      >
        {/* Un espacio al final: sin él, un salto de línea final no dejaría su línea en el espejo. */}
        <TextoConVariables texto={valor} claves={claves} />{' '}
      </div>
      <textarea
        ref={areaRef}
        id={id}
        value={valor}
        disabled={deshabilitado}
        maxLength={largoMaximo * 4}
        aria-invalid={conAviso ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          CAJA,
          'border-input aria-invalid:border-destructive absolute inset-0 resize-none overflow-y-auto bg-transparent text-transparent caret-(--color-ink) outline-none disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
        onSelect={alMoverLaSeleccion}
        onBlur={alMoverLaSeleccion}
        onScroll={alDesplazar}
      />
    </div>
  )
}
