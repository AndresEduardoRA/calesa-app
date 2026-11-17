'use client'

import { ChevronDownIcon } from 'lucide-react'
import {
  createElement,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from 'cn'
import { BloquesALaVista, useNivelDeBloque } from './bloques-a-la-vista'

type Props = {
  titulo: string
  descripcion?: string
  // Los bloques secundarios nacen plegados: el formulario muestra primero lo imprescindible.
  plegado?: boolean
  // Lo abre aunque esté plegado: un bloque con un error adentro no puede quedar cerrado.
  forzarAbierto?: boolean
  // Avisa cada vez que se abre (no cuando lo abre `forzarAbierto`): para montar su contenido recién entonces. A la vista, una vez al montarse.
  onAbrir?: () => void
  className?: string
  children: ReactNode
}

const CAJA = 'rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)'
const CUERPO = 'grid grid-cols-[minmax(0,1fr)] gap-4'

// Sección plegable de un formulario o de una ficha. Es un <details> nativo: funciona con teclado
// y lector de pantalla sin nada extra, y lo plegado sigue en el DOM (no se pierde lo tipeado ni
// deja de enviarse con el formulario). Dentro de `<BloquesALaVista>` va a la vista: `BloqueALaVista`.
export function Bloque(props: Props) {
  const nivel = useNivelDeBloque()
  return nivel === null ? (
    <BloquePlegable {...props} />
  ) : (
    <BloqueALaVista {...props} nivel={nivel} />
  )
}

function BloquePlegable({
  titulo,
  descripcion,
  plegado = false,
  forzarAbierto = false,
  onAbrir,
  className,
  children,
}: Props) {
  const [abierto, setAbierto] = useState(!plegado)

  return (
    <details
      data-slot="bloque"
      open={abierto || forzarAbierto}
      onToggle={(evento) => {
        setAbierto(evento.currentTarget.open)
        if (evento.currentTarget.open) onAbrir?.()
      }}
      className={cn('group', CAJA, className)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-(--radius-card) px-4 py-2.5 outline-none select-none focus-visible:shadow-(--shadow-focus) [&::-webkit-details-marker]:hidden">
        <span className="grid gap-0.5">
          <span className="text-(length:--text-base) font-medium text-(--color-ink)">{titulo}</span>
          {descripcion ? (
            <span className="text-(length:--text-sm) text-(--color-ink-soft)">{descripcion}</span>
          ) : null}
        </span>
        <ChevronDownIcon
          aria-hidden
          className="size-4 shrink-0 text-(--color-ink-faint) transition-transform duration-(--dur-rapida) group-open:rotate-180"
        />
      </summary>
      <div className={cn(CUERPO, 'border-t border-(--color-line) p-4')}>{children}</div>
    </details>
  )
}

// A la vista: una `<section>` con su encabezado (`h3`, `h4` si va dentro de otro; enfocable con `tabIndex=-1` para llevarle el foco). `plegado` y
// `forzarAbierto` no aplican: siempre está abierto. Los bloques de adentro bajan un nivel.
function BloqueALaVista({
  titulo,
  descripcion,
  onAbrir,
  className,
  children,
  nivel,
}: Props & { nivel: number }) {
  const id = useId()
  const avisado = useRef(false)
  const avisar = useEffectEvent(() => {
    onAbrir?.()
  })
  useEffect(() => {
    if (!avisado.current) {
      avisado.current = true
      avisar()
    }
  }, [])
  const encabezado = createElement(
    `h${String(Math.min(nivel, 6))}`,
    {
      id,
      tabIndex: -1,
      className:
        'text-(length:--text-base) font-medium text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus)',
    },
    titulo,
  )
  return (
    <section
      data-slot="bloque"
      aria-labelledby={id}
      className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-4', CAJA, className)}
    >
      <div className="grid gap-0.5">
        {encabezado}
        {descripcion ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{descripcion}</p>
        ) : null}
      </div>
      <div className={CUERPO}>
        <BloquesALaVista nivel={nivel + 1}>{children}</BloquesALaVista>
      </div>
    </section>
  )
}
