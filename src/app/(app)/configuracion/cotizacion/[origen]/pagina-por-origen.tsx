import type { ReactNode } from 'react'
import type { PestanaDeCotizacion } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { MarcoDeCotizacion } from '../marco-de-cotizacion'
import { parteDelOrigen } from '../seccion'
import { abrirOrigenDeCotizacion, type OrigenDeCotizacion } from './abrir'

// Lo común a las cuatro pestañas de un origen: comprueba el origen y el permiso (`abrirOrigenDeCotizacion`) y dibuja el marco con los chips de
// origen y las pestañas. El contenido lo pone cada `page.tsx`, que importa sólo su pantalla: separar las pestañas en rutas no trae los cuatro
// editores a cada página.
export async function PaginaPorOrigen({
  id,
  pestana,
  ancho,
  contenido,
}: {
  id: string
  pestana: PestanaDeCotizacion
  ancho?: 'angosto' | 'ancho'
  contenido: (origen: OrigenDeCotizacion) => ReactNode
}) {
  const abierto = await abrirOrigenDeCotizacion(id, pestana)
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <MarcoDeCotizacion
      parte={parteDelOrigen(pestana)}
      pestanas={abierto.pestanas}
      origenes={abierto.origenes}
      origenAbierto={abierto.origen.id}
      {...(ancho === undefined ? {} : { ancho })}
    >
      {contenido(abierto.origen)}
    </MarcoDeCotizacion>
  )
}
