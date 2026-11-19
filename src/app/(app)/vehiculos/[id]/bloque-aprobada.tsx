import { connection } from 'next/server'
import { leerAprobadaDelVehiculo } from '@/modules/cotizaciones'
import { AprobadaDelVehiculo } from '@/modules/cotizaciones/pantallas/aprobada-del-vehiculo'
import {
  BotonDeCompartirDeLaFila,
  PortadaDeLaCotizacionDiferida,
} from '@/modules/cotizaciones/pantallas/tarjeta-aprobada-del-vehiculo'
import { datosO } from '@/shared/lib/errores'

type Props = {
  vehiculo: { id: string; titulo: string }
  // La hoja de cotizar con este vehículo y la vuelta a la ficha, o null si quien mira no cotiza en su origen.
  cotizar: string | null
}

// Lo de adentro de «Cotización aprobada» (sólo se monta con `cotizaciones.ver` del origen): la aprobada que quien mira ve, leída tras su `<Suspense>`.
// Un fallo cae en el límite del bloque («No pudimos cargar «Cotización aprobada».» con «Reintentar»). La portada y «Compartir» son del área `tarjeta`:
// los une la página.
export async function BloqueAprobada({ vehiculo, cotizar }: Props) {
  await connection()
  const fila = datosO(await leerAprobadaDelVehiculo(vehiculo.id))
  return (
    <AprobadaDelVehiculo
      fila={fila}
      tituloDelVehiculo={vehiculo.titulo}
      cotizar={cotizar}
      portada={
        fila === null ? null : (
          <PortadaDeLaCotizacionDiferida
            cotizacionId={fila.id}
            numero={fila.numero}
            total={{ valor: fila.totalBase, moneda: fila.monedaMostrar }}
          />
        )
      }
      compartir={fila === null ? null : <BotonDeCompartirDeLaFila cotizacionId={fila.id} />}
    />
  )
}
