import type { ReactNode } from 'react'
import {
  CLAVE_DE_VEHICULO,
  tituloAparteDelNumero,
  tituloDeLaCotizacion,
} from '@/modules/cotizaciones'
import { ProveedorDelTitulo } from '@/modules/cotizaciones/pantallas/cotizacion'
import { elegidoDesde, type Vehiculo } from '@/modules/vehiculos'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { BarraDeLaGuardadaDiferida } from './diferidos'

type Guardada = {
  cotizacion: {
    id: string
    numero: number
    origenId: string
    vehiculoId: string | null
    titulo: string | null
    tituloManual: boolean
    actualizadoEn: string
  }
  puedeGuardar: boolean
}

// El título de una guardada (T307) sobre la cabecera y la hoja: lo guardado, sin `key` (remontaría la hoja y su guardado): con la versión nueva (tras guardar o
// «Recargar») el proveedor vuelve a lo guardado y su borrador va por versión. El automático es el título del vehículo si quien mira lo ve; si no, el guardado (la base no deja guardar a quien no ve el vehículo).
export function ConElTituloDeLaGuardada({
  hoja,
  personaId,
  vehiculo,
  children,
}: {
  hoja: Guardada
  personaId: string
  vehiculo: Vehiculo | null
  children: ReactNode
}) {
  const { cotizacion } = hoja
  return (
    <ProveedorDelTitulo
      deLaPestana={{
        personaId,
        cotizacionId: cotizacion.id,
        actualizadoEn: cotizacion.actualizadoEn,
      }}
      vehiculo={vehiculo?.titulo ?? (cotizacion.tituloManual ? null : cotizacion.titulo)}
      titulo={cotizacion.titulo}
      tituloManual={cotizacion.tituloManual}
      puede={hoja.puedeGuardar}
    >
      {children}
    </ProveedorDelTitulo>
  )
}

// La barra del vehículo de la cabecera (en lugar de «Vehículo: X»): el título grande y el vehículo debajo; con `puede_guardar`, abre el panel con el campo del título.
// `diferido()` no dibuja nada en el servidor: el contenedor reserva desde el HTML el alto de la barra de una línea, así la hoja no salta al llegar (ni un clic cae
// donde ya no está lo que se apuntó).
export function barraDeLaCabecera(hoja: Guardada, vehiculo: Vehiculo | null, permisos: Permisos) {
  const { cotizacion } = hoja
  return (
    <div className="min-h-14 min-w-0">
      <BarraDeLaGuardadaDiferida
        origenId={cotizacion.origenId}
        // Sólo nombra «Cierre subasta» en las listas del panel, que una guardada no dibuja.
        esSubasta={false}
        claveDeLaUrl={CLAVE_DE_VEHICULO}
        numero={cotizacion.numero}
        elegido={vehiculo === null ? null : elegidoDesde(vehiculo)}
        conVehiculo={cotizacion.vehiculoId !== null}
        puedeVer={puede(permisos, 'vehiculos.ver', cotizacion.origenId)}
        puedeGuardar={hoja.puedeGuardar}
      />
    </div>
  )
}

// El título de la tarjeta y del PDF de una guardada: el guardado (la tarjeta dibuja lo guardado), sin el de respaldo «Cotización n.º N», que ya va junto al número.
export const tituloDeLaTarjeta = (hoja: Guardada, vehiculo: Vehiculo | null) =>
  tituloAparteDelNumero(
    tituloDeLaCotizacion({
      titulo: hoja.cotizacion.titulo,
      vehiculo: vehiculo?.titulo ?? null,
      numero: hoja.cotizacion.numero,
    }),
  )
