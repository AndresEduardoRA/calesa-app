import type { ReactNode } from 'react'
import {
  CLAVE_DE_VEHICULO,
  MOTIVO_DE_LA_FINAL,
  tituloAparteDelNumero,
  tituloDeLaCotizacion,
  type CambioPermitido,
} from '@/modules/cotizaciones'
import { ProveedorDelTitulo } from '@/modules/cotizaciones/pantallas/cotizacion'
import { elegidoDesde, type Vehiculo } from '@/modules/vehiculos'
import type { ModoDeLaBarra } from '@/modules/vehiculos/pantallas/cotizar'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { AvisoDeSubastaDeLaHoja } from '../aviso-de-subasta'
import { BarraDeLaGuardadaDiferida } from './diferidos'
import type { LoDelVehiculo } from './vehiculo-de-la-guardada'

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

// Lo que la regla de `cotizaciones` permite, en el modo de la barra de `vehiculos`.
const MODO: Readonly<Record<CambioPermitido, ModoDeLaBarra>> = {
  elige: 'cambiar',
  final: 'ver_elegido',
  no: 'solo_mostrar',
}

const NO_SE_PUEDE_USAR = 'No se puede usar ese vehículo.'

// El título de una guardada (T307) sobre la cabecera y la hoja: lo guardado, sin `key` (remontaría la hoja y su guardado): con la versión nueva (tras guardar o
// «Recargar») el proveedor vuelve a lo guardado y su borrador va por versión. El automático es el título del vehículo **de la hoja** (el elegido para cambiarlo, T315, o el
// guardado) si quien mira lo ve; si no, el guardado (la base no deja guardar a quien no ve el vehículo). Un manual se respeta.
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

// La barra del vehículo de la cabecera (en lugar de «Vehículo: X»): el título grande y el vehículo de la hoja debajo; con `puede_guardar`, abre el panel con el campo del
// título y, en una preventa, el de cotizar para elegir otro (T315). Bajo la barra, el aviso de subasta cerrada del vehículo recién elegido (no del guardado: la guardada no
// paga esas lecturas al abrirse). `diferido()` no dibuja nada en el servidor: el contenedor reserva desde el HTML el alto de la barra de una línea, así la hoja no salta al
// llegar (ni un clic cae donde ya no está lo que se apuntó).
export function barraDeLaCabecera(
  hoja: Guardada,
  vehiculo: Vehiculo | null,
  delVehiculo: LoDelVehiculo,
  permisos: Permisos,
) {
  const { cotizacion } = hoja
  const { cambio, nuevo, origen, alta, rechazado } = delVehiculo
  return (
    <div className="grid min-h-14 min-w-0 gap-2">
      <BarraDeLaGuardadaDiferida
        origenId={cotizacion.origenId}
        esSubasta={origen?.tipo === 'subasta'}
        claveDeLaUrl={CLAVE_DE_VEHICULO}
        numero={cotizacion.numero}
        elegido={vehiculo === null ? null : elegidoDesde(vehiculo)}
        conVehiculo={cotizacion.vehiculoId !== null || nuevo !== null}
        puedeVer={puede(permisos, 'vehiculos.ver', cotizacion.origenId)}
        puedeGuardar={hoja.puedeGuardar}
        modo={MODO[cambio]}
        motivoSinCambiar={cambio === 'final' ? MOTIVO_DE_LA_FINAL : null}
        avisoDelElegido={rechazado ? NO_SE_PUEDE_USAR : null}
        alta={alta}
      />
      {origen === null ? null : (
        <AvisoDeSubastaDeLaHoja elegido={nuevo} origen={origen} permisos={permisos} />
      )}
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
