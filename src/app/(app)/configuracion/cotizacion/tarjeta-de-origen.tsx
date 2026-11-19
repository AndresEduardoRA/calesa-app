import { CircleCheckIcon, CircleDashedIcon } from 'lucide-react'
import Link from 'next/link'
import type { PublicadoDelOrigen } from '@/modules/cotizaciones'
import { formatearNumero } from '@/shared/lib/formato'
import { rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { faltasDelOrigen } from './faltas'

type Props = {
  origen: { id: string; nombre: string; color: string; activo: boolean }
  publicado: PublicadoDelOrigen
  locale: string
}

// Un origen en el inicio de Configuración › Cotización: su nombre (el enlace a su fórmula), si está inactivo (se configura igual), la fórmula y
// la tarjeta publicadas y lo que le falta, cada falta con el enlace a su pestaña. No es la «tarjeta de la lista» del patrón `ui/lista`.
export function TarjetaDeOrigen({ origen, publicado, locale }: Props) {
  const { versionDeLaFormula, tarjetaPublicada } = publicado
  const faltas = faltasDelOrigen({ activo: origen.activo, versionDeLaFormula, tarjetaPublicada })
  const formula =
    versionDeLaFormula === null
      ? 'Sin fórmula publicada'
      : `v${formatearNumero(versionDeLaFormula, { locale, decimales: 0 })} publicada`
  return (
    <li className="grid min-w-0 content-start gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <Link
          href={rutaDeConfiguracionDeCotizacion(origen.id, 'formula')}
          className="-mx-1 inline-flex min-h-11 min-w-0 items-center gap-2 rounded-(--radius-md) px-1 text-(length:--text-base) font-medium text-(--color-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-8"
        >
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: origen.color }}
          />
          <span className="min-w-0 break-words">{origen.nombre}</span>
        </Link>
        {origen.activo ? null : <Badge variant="outline">Inactivo</Badge>}
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {formula} · {tarjetaPublicada ? 'Tarjeta publicada' : 'Sin tarjeta'}
      </p>
      {faltas.length > 0 ? (
        <ul className="grid gap-1">
          {faltas.map((falta) => (
            <li key={falta.pestana}>
              <Link
                href={rutaDeConfiguracionDeCotizacion(origen.id, falta.pestana)}
                className="inline-flex min-h-11 items-center gap-1.5 text-(length:--text-sm) text-(--color-aviso-ink) underline-offset-4 hover:underline md:min-h-6"
              >
                <CircleDashedIcon aria-hidden className="size-4 shrink-0" />
                {falta.texto}
              </Link>
            </li>
          ))}
        </ul>
      ) : origen.activo ? (
        <p className="flex items-center gap-1.5 text-(length:--text-sm) text-(--color-positivo-ink)">
          <CircleCheckIcon aria-hidden className="size-4 shrink-0" />
          Nada pendiente
        </p>
      ) : null}
    </li>
  )
}
