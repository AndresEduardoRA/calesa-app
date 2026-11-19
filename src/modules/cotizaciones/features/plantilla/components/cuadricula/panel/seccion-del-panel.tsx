import type { ReactNode } from 'react'

// Una sección del panel del editor: su título y lo suyo, a la vista (como el inspector de V1: «Contenido», «Color», «Formato»…).
export function SeccionDelPanel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="grid min-w-0 gap-2">
      <h4 className="text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft) uppercase">
        {titulo}
      </h4>
      {children}
    </section>
  )
}
