// Lo que el área `aprobada` llena en el resumen de una cotización de `/cotizaciones` (`?cotizacion=`): «De este vehículo», entre los datos y las pestañas. Sólo `src/app`
// importa este archivo (`.claude/rules/modulos.md`): reexporta sólo la cáscara con `diferido()`; el código del bloque llega al abrir el resumen.
import { DeEsteVehiculoDiferido } from '../features/aprobada/components/de-este-vehiculo/diferidos'
import type { HuecosDelResumen } from '../features/hoja/components/huecos-del-resumen'

export const HUECOS_DE_APROBADA_EN_EL_RESUMEN: HuecosDelResumen = {
  DeEsteVehiculo: DeEsteVehiculoDiferido,
}
