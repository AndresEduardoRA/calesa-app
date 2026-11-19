import type { Route } from 'next'
import Link from 'next/link'
import { rutaDeLaCotizacion } from '../../../../entities/ruta-de-la-hoja'

// Bajo la cabecera de una cotización hermana (glosario: «Cotizaciones hermanas»): «Ver la de <etiqueta de la otra>» si la otra está disponible y, si se abrió sola,
// por qué. Sin JS propio (un enlace): viaja en el HTML del servidor.
export function EnlaceALaHermana({
  hermana,
  etiqueta,
  aviso,
}: {
  hermana: { id: string; disponible: boolean }
  etiqueta: string
  aviso: string | null
}) {
  return (
    <div
      data-hermana=""
      className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-(length:--text-sm)"
    >
      {hermana.disponible ? (
        <Link
          href={rutaDeLaCotizacion(hermana.id) as Route}
          className="inline-flex min-h-11 items-center font-medium text-(--color-ink) underline md:min-h-0"
        >
          Ver la de {etiqueta}
        </Link>
      ) : null}
      {aviso === null ? null : <p className="text-(--color-ink-soft)">{aviso}</p>}
    </div>
  )
}
