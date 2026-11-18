'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Lo que el layout de Configuración dibuja sólo dentro de una sección: el menú, «‹ Configuración» y el selector. En el inicio no van (las
// tarjetas ya son el menú). Un layout no se vuelve a dibujar al pasar de una página a otra: se decide en el navegador con la ruta.
export function EnUnaSeccion({ inicio, children }: { inicio: string; children: ReactNode }) {
  return usePathname() === inicio ? null : children
}
