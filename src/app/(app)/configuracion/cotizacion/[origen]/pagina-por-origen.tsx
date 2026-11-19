import type { ReactNode } from 'react'
import { EmpezarDesdeUnaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla-de-v1'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import type { PestanaDeCotizacion } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { MarcoDeCotizacion } from '../marco-de-cotizacion'
import { parteDelOrigen } from '../seccion'
import { abrirOrigenDeCotizacion, type OrigenDeCotizacion } from './abrir'

// Lo común a las cuatro pestañas de un origen: comprueba el origen y el permiso (`abrirOrigenDeCotizacion`) y dibuja el marco con los chips de
// origen, «Empezar desde una plantilla» (sólo abre un origen que la persona configura: `cotizaciones.configurar` de ese origen) y las pestañas. El contenido lo pone cada `page.tsx`, que importa sólo su pantalla: separar las pestañas en rutas no trae los cuatro
// editores a cada página.
export async function PaginaPorOrigen({
  id,
  pestana,
  ancho,
  contenido,
}: {
  id: string
  pestana: PestanaDeCotizacion
  // `completo`: sin tope de ancho (la tarjeta).
  ancho?: 'angosto' | 'ancho' | 'completo'
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
      accionDelOrigen={
        <EmpezarDesdeUnaPlantilla
          origen={{ id: abierto.origen.id, nombre: abierto.origen.nombre }}
          Lienzo={LienzoDeLaPlantillaDiferido}
        />
      }
      {...(ancho === undefined ? {} : { ancho })}
    >
      {contenido(abierto.origen)}
    </MarcoDeCotizacion>
  )
}
