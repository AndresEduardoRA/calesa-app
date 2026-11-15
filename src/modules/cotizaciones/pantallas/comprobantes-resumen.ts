// Lo que el área `comprobantes` llena en el resumen de una cotización de `/cotizaciones`: la lista de comprobantes bajo los adjuntos. Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`): reexporta sólo la cáscara con `diferido()`.
import { ComprobantesDelResumenDiferido } from '../features/comprobantes/components/resumen/diferidos'
import type { HuecosDelResumen } from '../features/hoja/components/huecos-del-resumen'

export const HUECOS_DE_COMPROBANTES_EN_EL_RESUMEN: HuecosDelResumen = {
  Comprobantes: ComprobantesDelResumenDiferido,
}
