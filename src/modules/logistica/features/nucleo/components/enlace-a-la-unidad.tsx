'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { SufijoDeVisto } from '@/shared/ui/lista'
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
// «visto» de una lista (`SufijoDeVisto`, `[data-abre-resumen]` del nombre) se enchufa en un solo lugar. Un enlace de verdad: Ctrl o clic central lo abren en otra pestaña. El
// nombre va en un `span` marcado y no en el enlace mismo: así un clic en el enlace no lo cuenta la fila de la tabla (`esClicPropio`) y no se navega dos veces.
export function EnlaceALaUnidad({ id, nombre, hueco, className }: Props) {
  return (
    <Link
      href={rutaDeLaUnidad(id, hueco) as Route}
      prefetch={false}
      data-unidad={id}
      className={
        className ??
        'rounded-(--radius-input) text-(length:--text-sm) font-medium break-words text-(--color-ink) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)'
      }
    >
      <span data-abre-resumen="">{nombre}</span>
      <SufijoDeVisto id={id} />
    </Link>
  )
}
