'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { SufijoDeVisto, useVistoDeLista } from '@/shared/ui/lista'
import { rutaDeLaUnidad } from '../../../entities/nucleo/enlaces'

type Props = {
  id: string
  // El nombre del vehículo («<principal> · <título>»).
  nombre: string
  // Un hueco que la página abre de entrada (`documentos`…): el enlace de «Revisar» o «Renovar» de la bandeja.
  hueco?: string
  className?: string
}

// El enlace de un vehículo a su página de logística (`/logistica/vehiculo/<id>`), nunca a un drawer: la bandeja, la lista de una fase y «dónde está» lo usan, así el
// «visto» de una lista (`SufijoDeVisto` y el tono del nombre, `[data-abre-resumen]`) se enchufa en un solo lugar: «dónde está» y las unidades de un grupo, que no son una fila con `data-visto`, también lo dibujan. Un enlace de verdad: Ctrl o clic central lo abren en otra pestaña. El
// nombre va en un `span` marcado y no en el enlace mismo: así un clic en el enlace no lo cuenta la fila de la tabla (`esClicPropio`) y no se navega dos veces.
export function EnlaceALaUnidad({ id, nombre, hueco, className }: Props) {
  const visto = useVistoDeLista(id)
  return (
    <Link
      href={rutaDeLaUnidad(id, hueco) as Route}
      prefetch={false}
      data-unidad={id}
      className={
        className ??
        'inline-flex min-h-11 items-center rounded-(--radius-input) text-(length:--text-sm) font-medium break-words text-(--color-ink) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-0'
      }
    >
      <span
        data-abre-resumen=""
        className={visto === 'visto' ? 'text-(--color-ink-soft)' : undefined}
      >
        {nombre}
      </span>
      <SufijoDeVisto id={id} />
    </Link>
  )
}
