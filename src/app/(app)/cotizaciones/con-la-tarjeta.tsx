import type { ComponentProps, ReactNode } from 'react'
import { ProveedorDeLaTarjeta } from '@/modules/cotizaciones/pantallas/tarjeta'
import type { AsesorDeLaTarjeta } from '@/modules/cotizaciones'
import { getAjustes } from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'

export type PropsDeLaTarjeta = {
  // El vehículo (título, lote y VIN) si quien mira lo ve.
  vehiculo: { titulo: string; lote: string | null; vin: string | null } | null
  // «Asesor:» de la tarjeta: quien cotiza en la hoja nueva y quien creó la cotización en una guardada (P2 a); nulo, no va.
  asesor: AsesorDeLaTarjeta | null
  // El nombre del cliente, sólo si quien mira lo ve.
  cliente?: string | null
  // Una guardada: su número, si venció y hasta cuándo vale, y el último guardado (la fecha del encabezado, P3 a). La hoja nueva: nulos.
  numero?: number | null
  vencida?: boolean
  venceEl?: string | null
  guardadaEl?: string | null
  // El título de una guardada ya resuelto (el guardado: la tarjeta dibuja lo guardado). La hoja nueva no lo pasa: la tarjeta lee el que se está escribiendo.
  titulo?: string | null
  // Una guardada: sus retoques, su versión y si quien mira la puede guardar («Retocar»). La hoja nueva no lo pasa.
  retoque?: ComponentProps<typeof ProveedorDeLaTarjeta>['retoque']
}

type Props = PropsDeLaTarjeta & {
  // La de una guardada, para «Descargar PDF» (4.18-3b); nulo en la hoja nueva.
  cotizacionId: string | null
  children: ReactNode
}

// La pantalla de la hoja (`/cotizaciones/nuevo` y `/cotizaciones/[id]`) con «Vista previa» (4.18-2): el proveedor del área `tarjeta` con lo que sólo la página sabe (el asesor, el
// vehículo, el nombre y el logo de la empresa). Sin él la hoja no dibuja el botón.
export async function ConLaTarjeta({
  vehiculo,
  asesor,
  cliente = null,
  numero = null,
  vencida = false,
  venceEl = null,
  guardadaEl = null,
  titulo,
  retoque,
  cotizacionId,
  children,
}: Props) {
  const ajustes = await getAjustes()
  const url = urlPublicaONull('marca', ajustes.logoRuta)
  return (
    <ProveedorDeLaTarjeta
      cliente={cliente}
      vehiculo={vehiculo}
      asesor={asesor}
      numero={numero}
      vencida={vencida}
      venceEl={venceEl}
      guardadaEl={guardadaEl}
      cotizacionId={cotizacionId}
      empresa={ajustes.nombre}
      logo={url === null ? null : { nombre: ajustes.nombre, url }}
      {...(titulo === undefined ? {} : { titulo })}
      {...(retoque === undefined ? {} : { retoque })}
    >
      {children}
    </ProveedorDeLaTarjeta>
  )
}
