import type { ReactNode } from 'react'

export type FilaDeValores = {
  etiqueta: string
  // Lo guardado; `null` = sin dato (se dice «Sin dato», no se deja en blanco).
  valor: ReactNode | null
  // Una explicación bajo el valor (por qué no se cambia).
  nota?: string
}

// Los valores guardados de una tarjeta, como texto: «etiqueta, valor». Una lista de definiciones en dos columnas que, en una tarjeta angosta
// (`@xs`), pasa a una. Parte lo que no cabe (`break-words`) y deja ceder la columna (`minmax(0, …)`): con el texto al 200 % nada se sale.
export function ValoresDeLaTarjeta({ filas }: { filas: readonly FilaDeValores[] }) {
  return (
    <dl className="@container grid grid-cols-1 gap-x-4 gap-y-2 text-(length:--text-sm) @xs:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="contents">
          <dt className="min-w-0 break-words text-(--color-ink-faint)">{fila.etiqueta}</dt>
          <dd className="min-w-0 break-words text-(--color-ink) @xs:text-end">
            {fila.valor === null ? (
              <span className="text-(--color-ink-faint)">Sin dato</span>
            ) : (
              fila.valor
            )}
            {fila.nota ? (
              <span className="mt-0.5 block text-(length:--text-xs) text-(--color-ink-faint)">
                {fila.nota}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
