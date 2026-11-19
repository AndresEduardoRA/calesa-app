'use client'

import { useEffect, useId, useRef } from 'react'
import { MAXIMO_DE_CARACTERES_DE_UN_TEXTO } from '../../../../entities/cuadricula-de-la-tarjeta'
import { motivoDelTexto } from '../../../../entities/plantilla/edicion/contenido'
import { caracteres } from '../../../../entities/json-de-la-base'

type Props = {
  texto: string
  // Dónde va, en px del lienzo ya escalados y con su margen.
  caja: { x: number; y: number; ancho: number; alto: number }
  alEscribir: (texto: string) => void
  alConfirmar: () => void
  // Tras confirmar con Enter un texto que se puede guardar: el foco vuelve a la grilla.
  alVolver: () => void
  alDescartar: () => void
}

// Escribir en el lugar (Enter, F2 o una letra sobre una celda de texto o vacía): un campo encima de la celda, con «n de 300» y su motivo. Enter confirma, Esc descarta,
// Shift+Enter es un salto de línea y salir del campo confirma. Un texto que empieza con «=» es texto: la tarjeta no tiene fórmulas propias.
export function CeldaEnEdicion({
  texto,
  caja,
  alEscribir,
  alConfirmar,
  alVolver,
  alDescartar,
}: Props) {
  const campo = useRef<HTMLTextAreaElement>(null)
  const idDelPie = useId()
  const motivo = motivoDelTexto(texto)
  useEffect(() => {
    const nodo = campo.current
    if (nodo === null) return
    nodo.focus()
    nodo.setSelectionRange(nodo.value.length, nodo.value.length)
  }, [])
  return (
    <div
      className="absolute z-20 grid gap-1"
      style={{ left: caja.x, top: caja.y, minWidth: Math.max(caja.ancho, 192) }}
      data-celda-en-edicion=""
    >
      <textarea
        ref={campo}
        value={texto}
        aria-label="Texto de la celda"
        aria-describedby={idDelPie}
        aria-invalid={motivo !== null}
        rows={Math.max(1, texto.split('\n').length)}
        onChange={(e) => {
          alEscribir(e.target.value)
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            alConfirmar()
            if (motivo === null) alVolver()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            alDescartar()
          }
        }}
        onBlur={alConfirmar}
        className="w-full resize-none rounded-(--radius-sm) border-2 border-(--color-primario) bg-(--color-paper) px-1.5 py-1 text-(length:--text-sm) text-(--color-ink) shadow-(--shadow-md) outline-none"
        style={{ minHeight: caja.alto }}
      />
      <p
        id={idDelPie}
        className="w-fit rounded-(--radius-sm) bg-(--color-paper) px-1.5 text-(length:--text-xs) text-(--color-ink-soft) shadow-(--shadow-sm)"
      >
        {caracteres(texto)} de {MAXIMO_DE_CARACTERES_DE_UN_TEXTO}
        {motivo === null ? null : <span className="text-(--color-peligro-ink)"> · {motivo}</span>}
      </p>
    </div>
  )
}
