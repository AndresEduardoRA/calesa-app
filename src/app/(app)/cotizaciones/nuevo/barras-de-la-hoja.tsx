import { CLAVE_DE_LEAD } from '@/modules/cotizaciones'
import { type ClienteElegido } from '@/modules/leads'
import { BarraDelCliente } from '@/modules/leads/pantallas/cotizar'
import type { OrigenResumen } from '@/modules/origenes'
import { elegidoDesde } from '@/modules/vehiculos'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { AvisoDeSubastaDeLaHoja } from '../aviso-de-subasta'
import type { VehiculoDeLaUrl } from '../vehiculo-de-la-hoja'
import { BarraConHistorial } from './barra-con-historial'
import type { leerLoDeLaHoja, paraElegirDe } from './lecturas-de-la-hoja'

// La barra del cliente de la hoja: lo que puede hacer quien mira con los leads, y si su rol no deja guardar sin cliente en este origen.
function BarraDelClienteDeLaHoja({
  cliente,
  permisos,
  obligatorio,
}: {
  cliente: ClienteElegido | null
  permisos: Permisos
  obligatorio: boolean
}) {
  return (
    <BarraDelCliente
      elegido={cliente}
      puedeVer={puede(permisos, 'leads.ver')}
      numeroGlobal={puede(permisos, 'leads.numero_global.ver')}
      puedeCrear={puede(permisos, 'leads.crear')}
      claveDeLaUrl={CLAVE_DE_LEAD}
      obligatorio={obligatorio}
    />
  )
}

// Las dos barras de arriba de la hoja y el aviso de subasta cerrada: fuera de la hoja (`[data-hoja]`) y del componente con `key`, así elegir otro vehículo o cliente no la vuelve a
// montar. Cada barra dice «Obligatorio» si el rol de quien mira no puede guardar sin ese vínculo en este origen.
export function BarrasDeLaHoja({
  sesion,
  origen,
  elegido,
  cliente,
  reglas,
}: {
  sesion: { permisos: Permisos }
  origen: OrigenResumen
  elegido: VehiculoDeLaUrl
  cliente: ClienteElegido | null
  reglas: Pick<Awaited<ReturnType<typeof leerLoDeLaHoja>>, 'conteo' | 'alta'> & {
    obligatorios: { lead: boolean; vehiculo: boolean }
    paraElegir: ReturnType<typeof paraElegirDe>
    abierta: string
  }
}) {
  const { obligatorios, conteo, alta, paraElegir, abierta } = reglas
  return (
    <>
      <BarraConHistorial
        origen={origen}
        elegido={elegido ? elegidoDesde(elegido.vehiculo) : null}
        conteo={conteo}
        alta={alta}
        puedeVer={puede(sesion.permisos, 'vehiculos.ver', origen.id)}
        paraElegir={paraElegir}
        abierta={abierta}
        obligatorio={obligatorios.vehiculo}
      />
      <AvisoDeSubastaDeLaHoja elegido={elegido} origen={origen} permisos={sesion.permisos} />
      <BarraDelClienteDeLaHoja
        cliente={cliente}
        permisos={sesion.permisos}
        obligatorio={obligatorios.lead}
      />
    </>
  )
}
