'use client'

import type { EntradaDeLaLeyenda } from '../../../../../entities/formula/referencias-tipeadas'

type Props = {
  leyenda: readonly EntradaDeLaLeyenda[]
  // «C7, Fees, insertada»: lo que dice la región viva al nombrar una celda con un clic.
  anuncio: string
}

// La leyenda de lo que nombra lo tipeado (D16): «C5 Remate · C7 Fees · B9 % de Agencia», cada referencia en su color (el mismo del borde de su celda). Debajo, la
// región viva que anuncia cada referencia insertada con un clic.
export function LeyendaDeReferencias({ leyenda, anuncio }: Props) {
  return (
    <>
      {leyenda.length === 0 ? null : (
        <p
          data-leyenda-de-referencias=""
          className="flex min-w-0 flex-wrap gap-x-1 gap-y-0.5 text-(length:--text-xs) text-(--color-ink-soft)"
        >
          {leyenda.map((r, i) => (
            <span key={r.texto} className="break-words">
              {i === 0 ? null : <span aria-hidden> · </span>}
              <span
                className="font-mono font-semibold"
                style={{ color: `var(--viz-series-${String((r.color % 6) + 1)})` }}
              >
                {r.texto}
              </span>{' '}
              {r.etiqueta}
            </span>
          ))}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>
    </>
  )
}
