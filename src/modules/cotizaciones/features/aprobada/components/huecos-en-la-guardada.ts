import type { HuecosDeLaGuardada } from '../../hoja/components/huecos'
import { AprobadaDeLaGuardada } from './aprobada-de-la-guardada'
import { LineaDeEsteVehiculo, SeccionDeEsteVehiculo } from './de-este-vehiculo'

// Lo que el área `aprobada` llena en la guardada (`/cotizaciones/[id]`): la insignia «Aprobada» y «Aprobar» en la cabecera (`Insignias`), la línea «Hay N
// cotizaciones más de este vehículo · Ver» bajo la cabecera (`BajoLaCabecera`) y el bloque «De este vehículo» bajo la hoja (`Debajo`, antes de «Comprobantes»).
export const HUECOS_DE_APROBADA_EN_LA_GUARDADA: HuecosDeLaGuardada = {
  Insignias: AprobadaDeLaGuardada,
  BajoLaCabecera: LineaDeEsteVehiculo,
  Debajo: SeccionDeEsteVehiculo,
}
