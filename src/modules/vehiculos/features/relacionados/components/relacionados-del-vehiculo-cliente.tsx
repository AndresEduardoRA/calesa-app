'use client'

import { useRouter } from 'next/navigation'
import type {
  LugarDeRelacionados,
  ParaRelacionados,
} from '../../../entities/acciones-de-relacionados'
import type { AvisosDelMenu } from '../../../entities/avisos-de-vehiculo'
import type {
  PresentacionDeRelacionados,
  RelacionadosDelVehiculo,
} from '../../../entities/relacionados'
import { ErrorDeRelacionados } from './error-de-relacionados'
import type { HuecosDeRelacionados } from './huecos'
import { RelacionadosDeUnVehiculo } from './relacionados-de-un-vehiculo'

type Props = {
  // Lo que leyó el servidor; null = no se pudo leer (el bloque dice el error con «Reintentar» y la ficha sigue).
  datos: RelacionadosDelVehiculo | null
  vehiculoId: string
  lugar: Exclude<LugarDeRelacionados, 'resumen'>
  para: ParaRelacionados
  huecos?: HuecosDeRelacionados
  numeroGlobal: boolean
  ofrecerPapelera: boolean
  avisos?: AvisosDelMenu
  // La unidad de logística: «Relacionados» en una línea.
  presentacion?: 'bloque' | PresentacionDeRelacionados
}

// El bloque «Relacionados» de un vehículo con lo que leyó el servidor (la ficha y la unidad de logística): `src/app` lo envuelve en un Client Component que le pone sus huecos, porque un
// componente no cruza de servidor a cliente como prop. Cada acción lograda revalida la pantalla (`revalidarVinculo()`).
export function RelacionadosDelVehiculoCliente({
  datos,
  presentacion = 'bloque',
  ...resto
}: Props) {
  const router = useRouter()
  if (datos === null) {
    return (
      <ErrorDeRelacionados
        presentacion={presentacion}
        alReintentar={() => {
          router.refresh()
        }}
      />
    )
  }
  return <RelacionadosDeUnVehiculo datos={datos} presentacion={presentacion} {...resto} />
}
