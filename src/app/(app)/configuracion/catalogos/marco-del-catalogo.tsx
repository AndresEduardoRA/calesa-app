import type { ReactNode } from 'react'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'

// Lo común a las páginas de Catálogos: el título con su frase (del registro, `seccion.ts`) y el contenido. Se navega por el menú de
// Configuración, que dibuja los catálogos en sus tramos; no hay pestañas.
export function MarcoDelCatalogo({
  sub,
  children,
}: {
  sub: { titulo: string; descripcion: string }
  children: ReactNode
}) {
  return (
    <div className="grid max-w-3xl min-w-0 gap-4">
      <EncabezadoDeConfiguracion titulo={sub.titulo} descripcion={sub.descripcion} />
      {children}
    </div>
  )
}
