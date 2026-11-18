import type { FilaOculta } from '../../../entities/tarjeta/geometria-de-la-tarjeta'

const MOTIVO = {
  no_aplica: (nodo: string) => `«${nodo}» no está en esta referencia`,
  cero: (nodo: string) => `«${nodo}» vale 0`,
} as const

// Las filas que la tarjeta no dibuja con esta referencia y por qué, como V1: «‹rótulo› — «X» no está en esta referencia» o «— «X» vale 0». Sin ocultas, nada.
export function OcultasDeLaTarjeta({ ocultas }: { ocultas: readonly FilaOculta[] }) {
  if (ocultas.length === 0) return null
  return (
    <section aria-label="Filas ocultas" data-ocultas-de-la-tarjeta="" className="grid gap-1">
      <h4 className="text-(length:--text-sm) font-semibold">
        Ocultas con esta referencia ({ocultas.length})
      </h4>
      <ul className="grid gap-0.5 text-(length:--text-xs) text-(--color-ink-soft)">
        {ocultas.map((o) => (
          <li key={o.fila} data-oculta={o.fila} className="[overflow-wrap:anywhere]">
            {o.etiqueta} — {MOTIVO[o.motivo](o.delNodo)}
          </li>
        ))}
      </ul>
    </section>
  )
}
