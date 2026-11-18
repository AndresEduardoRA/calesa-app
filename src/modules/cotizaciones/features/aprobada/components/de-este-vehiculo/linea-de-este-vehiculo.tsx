import { Suspense } from 'react'
import { leerOtrasDelVehiculo } from '../../../../areas/aprobada/composicion'
import { textoDeLaLinea } from '../../../../entities/aprobada/de-este-vehiculo'
import type { PropsDeUnHuecoDeLaGuardada } from '../../../hoja/components/huecos'
import { ID_DE_ESTE_VEHICULO } from './ancla'

// La línea bajo la cabecera de la guardada (hueco `BajoLaCabecera`): «Hay 2 cotizaciones más de este vehículo · Ver», que salta al bloque. Del servidor y sin JS;
// la misma lectura (con `cache()`) que decide si se dibuja el bloque, así que una no va sin la otra.
export function LineaDeEsteVehiculo(props: PropsDeUnHuecoDeLaGuardada) {
  return (
    <Suspense fallback={null}>
      <Linea {...props} />
    </Suspense>
  )
}

async function Linea({ cotizacion, vehiculo }: PropsDeUnHuecoDeLaGuardada) {
  if (vehiculo === null || cotizacion.vehiculoId === null) {
    return null
  }
  const otras = await leerOtrasDelVehiculo(vehiculo.id, cotizacion.id)
  const texto = otras.ok ? textoDeLaLinea(otras.data) : null
  if (texto === null) {
    return null
  }
  return (
    <p data-linea-de-este-vehiculo="" className="text-(length:--text-sm) text-(--color-ink-soft)">
      {texto} ·{' '}
      <a
        href={`#${ID_DE_ESTE_VEHICULO}`}
        className="inline-flex min-h-11 items-center underline hover:text-(--color-ink) md:min-h-0"
      >
        Ver
      </a>
    </p>
  )
}
