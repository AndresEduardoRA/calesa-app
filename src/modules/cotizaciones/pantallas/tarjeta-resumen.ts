// Lo que el área `tarjeta` llena en el resumen de una cotización de `/cotizaciones` (`?cotizacion=`): la imagen de la tarjeta, arriba de los datos. Sólo `src/app` importa este
// archivo (`.claude/rules/modulos.md`): reexporta sólo la cáscara con `diferido()`; el componente llega al abrir el resumen.
import { ImagenDeLaTarjetaDiferida } from '../features/tarjeta/components/imagen/diferidos'
import type { HuecosDelResumen } from '../features/hoja/components/huecos-del-resumen'

export const HUECOS_DE_TARJETA_EN_EL_RESUMEN: HuecosDelResumen = {
  Imagen: ImagenDeLaTarjetaDiferida,
}
