import type { ReactNode } from 'react'
import { ProveedorDeLaTarjeta } from '@/modules/cotizaciones/pantallas/tarjeta'
import { getAjustes } from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'

export type PropsDeLaTarjeta = {
  // El vehículo (título, lote y VIN) si quien mira lo ve.
  vehiculo: { titulo: string; lote: string | null; vin: string | null } | null
  // «Asesor:» de la tarjeta: quien cotiza en la hoja nueva y quien creó la cotización en una guardada (P2 a); nulo, no va.
  asesor: string | null
  // El nombre del cliente, sólo si quien mira lo ve.
  cliente?: string | null
  // Una guardada: su título, su número, si venció y hasta cuándo vale, y el último guardado (la fecha del encabezado, P3 a). La hoja nueva: nulos.
  titulo?: string | null
  numero?: number | null
  vencida?: boolean
  venceEl?: string | null
  guardadaEl?: string | null
}

type Props = PropsDeLaTarjeta & {
  // La de una guardada, para «Descargar PDF» (4.18-3b); nulo en la hoja nueva.
  cotizacionId: string | null
  children: ReactNode
}

// La pantalla de la hoja (`/cotizaciones/nuevo` y `/cotizaciones/[id]`) con «Vista previa» (4.18-2): el proveedor del área `tarjeta` con lo que sólo la página sabe (el asesor, el
// vehículo, el logo de la empresa). Sin él la hoja no dibuja el botón.
export async function ConLaTarjeta({
  vehiculo,
  asesor,
  cliente = null,
  titulo = null,
  numero = null,
  vencida = false,
  venceEl = null,
  guardadaEl = null,
  cotizacionId,
  children,
}: Props) {
  const ajustes = await getAjustes()
  const url = urlPublicaONull('marca', ajustes.logoRuta)
  return (
    <ProveedorDeLaTarjeta
      titulo={titulo}
      cliente={cliente}
      vehiculo={vehiculo}
      asesor={asesor}
      numero={numero}
      vencida={vencida}
      venceEl={venceEl}
      guardadaEl={guardadaEl}
      cotizacionId={cotizacionId}
      logo={url === null ? null : { nombre: ajustes.nombre, url }}
    >
      {children}
    </ProveedorDeLaTarjeta>
  )
}
