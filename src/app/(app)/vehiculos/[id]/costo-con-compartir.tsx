'use client'

import type { ComponentProps } from 'react'
import { useAbrirCompartirDeLaFila } from '@/modules/cotizaciones/pantallas/tarjeta-compartir'
import { CostoYSubasta } from '@/modules/vehiculos/pantallas/ficha'

// La subasta y el costo de la ficha con «Compartir la cotización» de la aprobada: el «Costo estimado» abre ese panel sobre la ficha (`?panel=compartir&para=<id>`) y el diálogo ya está montado
// (`paneles.tsx`). `vehiculos` no conoce `cotizaciones`: lo une esta pantalla, como el inventario (`listado-con-compartir.tsx`).
export function CostoConCompartir(props: Omit<ComponentProps<typeof CostoYSubasta>, 'compartir'>) {
  const abrir = useAbrirCompartirDeLaFila()
  return <CostoYSubasta {...props} compartir={abrir} />
}
