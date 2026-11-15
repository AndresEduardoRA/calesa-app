// Lo que el área `comentarios` llena en el resumen de una cotización de `/cotizaciones` (`?cotizacion=`): las pestañas «Todo», «Adjuntos», «Revisiones» y «Comentarios». Sólo `src/app` importa
// este archivo (`.claude/rules/modulos.md`): reexporta sólo la cáscara con `diferido()`; el código de las pestañas llega al abrir el resumen.
import { PestanasDeLaCotizacionDiferido } from '../features/comentarios/components/resumen/diferidos'
import type { HuecosDelResumen } from '../features/hoja/components/huecos-del-resumen'

export const HUECOS_DE_COMENTARIOS_EN_EL_RESUMEN: HuecosDelResumen = {
  Pestanas: PestanasDeLaCotizacionDiferido,
}
