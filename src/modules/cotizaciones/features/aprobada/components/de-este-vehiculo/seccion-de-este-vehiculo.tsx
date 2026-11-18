import { Suspense } from 'react'
import { origenesCon } from '@/shared/lib/permisos'
import { leerOtrasDelVehiculo } from '../../../../areas/aprobada/composicion'
import type { PropsDeUnHuecoDeLaGuardada } from '../../../hoja/components/huecos'
import { DeEsteVehiculoAlAcercarse } from './al-acercarse'
import { ID_DE_ESTE_VEHICULO } from './ancla'

// «De este vehículo» bajo la hoja de la guardada (hueco `Debajo`, antes de «Comprobantes»). El servidor decide si se dibuja tras `<Suspense>` (no retrasa la hoja):
// sin vehículo que quien mira vea, sin otras cotizaciones suyas que vea o si el conteo falla, nada (la página no se tumba). El título lo dibuja el servidor (el «Ver» de
// la línea salta a él sin JS); la lista llega al acercarse. Al navegador va dónde aprueba quien mira (`origenesCon`), no sus permisos.
export function SeccionDeEsteVehiculo(props: PropsDeUnHuecoDeLaGuardada) {
  return (
    <Suspense fallback={null}>
      <Seccion {...props} />
    </Suspense>
  )
}

async function Seccion({ cotizacion, vehiculo, permisos }: PropsDeUnHuecoDeLaGuardada) {
  if (vehiculo === null || cotizacion.vehiculoId === null) {
    return null
  }
  const otras = await leerOtrasDelVehiculo(vehiculo.id, cotizacion.id)
  if (!otras.ok || otras.data.n === 0) {
    return null
  }
  return (
    <section aria-labelledby={ID_DE_ESTE_VEHICULO} className="grid min-w-0 gap-3">
      <h2
        id={ID_DE_ESTE_VEHICULO}
        tabIndex={-1}
        className="scroll-mt-20 text-(length:--text-lg) font-semibold text-(--color-ink) outline-none"
      >
        De este vehículo
      </h2>
      <DeEsteVehiculoAlAcercarse
        vehiculo={vehiculo}
        cotizacionActual={cotizacion.id}
        aprobarEn={origenesCon(permisos, 'cotizaciones.aprobar')}
        conCasillas={false}
      />
    </section>
  )
}
