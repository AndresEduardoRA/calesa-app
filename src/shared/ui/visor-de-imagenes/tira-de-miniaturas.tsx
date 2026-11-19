'use client'

import Image from 'next/image'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { contador, vecina, type ImagenDelVisor } from './tipos'

type Props = {
  imagenes: readonly ImagenDelVisor[]
  // La que se ve (o la marcada): con borde y `aria-current`, no sólo con color.
  actual: number
  alElegir: (indice: number) => void
  etiqueta?: string
  // ← → (con la vuelta), Home y End mueven la marcada y el foco (`alMarcar`); Enter o clic la eligen. Sin esto (el visor, que ya atiende las
  // flechas en su diálogo), sólo clic.
  conTeclado?: boolean
  // Con `conTeclado`: la marcada cambió con las flechas (sin elegirla todavía).
  alMarcar?: (indice: number) => void
  tamano?: 'chica' | 'mediana'
}

const ANCHO = { chica: 'w-16', mediana: 'w-24' } as const
const SIZES = { chica: '64px', mediana: '96px' } as const

// El índice al que lleva una tecla de la tira, o null si la tecla no es suya.
function destinoDeLaTecla(tecla: string, actual: number, total: number): number | null {
  switch (tecla) {
    case 'ArrowRight':
      return vecina(actual, total, 1)
    case 'ArrowLeft':
      return vecina(actual, total, -1)
    case 'Home':
      return 0
    case 'End':
      return total - 1
    default:
      return null
  }
}

// La tira de miniaturas (docs/GLOSARIO.md): las fotos de una entidad en fila, desplazable de costado (soporta las 24), con la actual marcada y a
// la vista. La usan el visor (abajo de la foto grande), la ficha del vehículo (abajo del carrusel) y su ficha completa. Con menos de 2, nada.
// `relative` y `min-w-0`: lo que se desplaza no ensancha la página en el celular ni con el texto al 200 %.
export function TiraDeMiniaturas({
  imagenes,
  actual,
  alElegir,
  etiqueta = 'Miniaturas',
  conTeclado = false,
  alMarcar,
  tamano = 'chica',
}: Props) {
  const lista = useRef<HTMLOListElement>(null)
  const total = imagenes.length

  // La actual, siempre a la vista dentro de la tira (sin mover la página).
  useEffect(() => {
    const boton = lista.current?.querySelectorAll('button')[actual]
    boton?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [actual])

  if (total < 2) return null

  const alTeclear = (evento: KeyboardEvent<HTMLOListElement>) => {
    if (!conTeclado) return
    const destino = destinoDeLaTecla(evento.key, actual, total)
    if (destino === null) return
    evento.preventDefault()
    alMarcar?.(destino)
    lista.current?.querySelectorAll('button')[destino]?.focus()
  }

  return (
    <ol
      ref={lista}
      aria-label={etiqueta}
      data-tira-de-miniaturas=""
      className="relative flex min-w-0 snap-x gap-2 overflow-x-auto p-1"
      onKeyDown={alTeclear}
    >
      {imagenes.map((imagen, indice) => (
        <li key={imagen.id} className="shrink-0 snap-start">
          <button
            type="button"
            aria-label={`Ver la foto ${contador(indice, total)}`}
            aria-current={indice === actual ? 'true' : undefined}
            tabIndex={conTeclado && indice !== actual ? -1 : undefined}
            className={cn(
              'relative block aspect-4/3 overflow-hidden rounded-(--radius-sm) border-2 transition-opacity outline-none focus-visible:shadow-(--shadow-focus)',
              ANCHO[tamano],
              indice === actual
                ? 'border-(--color-primario)'
                : 'border-transparent opacity-70 hover:opacity-100',
            )}
            onClick={() => {
              alElegir(indice)
            }}
          >
            <Image
              src={imagen.miniatura}
              alt=""
              fill
              unoptimized
              loading="lazy"
              sizes={SIZES[tamano]}
              className="object-cover"
            />
          </button>
        </li>
      ))}
    </ol>
  )
}
