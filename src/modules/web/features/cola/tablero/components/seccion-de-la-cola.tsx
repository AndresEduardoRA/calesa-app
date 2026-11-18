import { cn } from 'cn'
import type { ReactNode } from 'react'

type Props = {
  id: string
  titulo: ReactNode
  // Una frase: qué hay en la sección.
  descripcion: string
  // La acción principal de la sección, a la derecha de su título (en el celular, debajo).
  accion?: ReactNode
  className?: string
  children: ReactNode
}

// Una de las tres secciones de la página de la cola («Sin asignar», «En la rueda», «Política de la cola»): su título (`h2`), una frase y su cuerpo.
export function SeccionDeLaCola({ id, titulo, descripcion, accion, className, children }: Props) {
  return (
    <section aria-labelledby={id} className={cn('grid gap-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="grid min-w-0 gap-0.5">
          <h2 id={id} className="text-(length:--text-lg) font-semibold text-(--color-ink)">
            {titulo}
          </h2>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{descripcion}</p>
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}
