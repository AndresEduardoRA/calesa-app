'use client'

import { FileTextIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { fechaRelativa } from '@/shared/lib/fechas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import {
  tituloDeLaFila,
  type FilaDeEsteVehiculo,
} from '../../../../entities/aprobada/de-este-vehiculo'
import { rutaDeLaCotizacion } from '../../../../entities/ruta-de-la-hoja'

type Props = {
  // La aprobada que quien mira ve, o null (no hay, o no la ve: no se distingue).
  fila: FilaDeEsteVehiculo | null
  // El título del vehículo: el de la aprobada si no tiene uno propio.
  tituloDelVehiculo: string
  // La hoja de cotizar con este vehículo y su origen, con la vuelta a la ficha (la arma `src/app`), o null sin `cotizaciones.crear` en el origen.
  cotizar: string | null
  // Del área `tarjeta`, compuestos por `src/app` (un área no importa otra): la portada de la aprobada y su «Compartir» (que no se ofrece en Modo Live).
  portada: ReactNode
  compartir: ReactNode
}

// «Cotización aprobada» en la ficha del vehículo: la portada de su tarjeta (el clic la abre en grande; en Modo Live, borrosa con «Oculto en Modo Live»),
// n.º y título, total con su modo, autor y fecha, y «Abrir» y «Compartir» a lo ancho (sin «Compartir» en Modo Live). Sin aprobada que quien mira vea,
// «Sin cotización aprobada» con «Cotizar» si puede. Sin cifras en un `aria-label` ni en un `title`: el total va con `<Monto>`.
export function AprobadaDelVehiculo({
  fila,
  tituloDelVehiculo,
  cotizar,
  portada,
  compartir,
}: Props) {
  const { zonaHoraria } = useRegional()
  if (fila === null) {
    return (
      <EstadoVacio
        compacto
        Icono={FileTextIcon}
        titulo="Sin cotización aprobada"
        {...(cotizar === null
          ? {}
          : {
              accion: (
                <Link
                  href={cotizar as Route}
                  className={buttonVariants({
                    variant: 'outline',
                    className: 'min-h-11 md:min-h-9',
                  })}
                >
                  Cotizar
                </Link>
              ),
            })}
      />
    )
  }
  const titulo = tituloDeLaFila(fila, tituloDelVehiculo)
  return (
    <div data-aprobada-del-vehiculo="" className="grid min-w-0 gap-3">
      {portada}
      <div className="grid min-w-0 gap-1">
        <p className="min-w-0 font-medium [overflow-wrap:anywhere] text-(--color-ink)">
          N.º {fila.numero} · {titulo}
        </p>
        <p className="text-(length:--text-base) font-semibold text-(--color-ink) tabular-nums">
          <Monto valor={fila.totalBase} moneda={fila.monedaMostrar ?? undefined} />
          {fila.modo === null ? null : (
            <span className="text-(length:--text-sm) font-normal text-(--color-ink-soft)">
              {` · ${fila.modo}`}
            </span>
          )}
        </p>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {fila.autor} · {fechaRelativa(fila.creadoEn, { zona: zonaHoraria })}
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2">
        <Link
          href={rutaDeLaCotizacion(fila.id) as Route}
          className={buttonVariants({ className: 'min-h-11 md:min-h-9' })}
        >
          Abrir
        </Link>
        {compartir}
      </div>
    </div>
  )
}
