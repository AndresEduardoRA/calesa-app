import { HUECOS_DE_APROBADA_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/aprobada-resumen'
import { HUECOS_DE_COMENTARIOS_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/comentarios-resumen'
import { HUECOS_DE_COMPROBANTES_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/comprobantes-resumen'
import { HUECOS_DE_TARJETA_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/tarjeta-resumen'

// Lo que las áreas `tarjeta`, `comentarios`, `comprobantes` y `aprobada` llenan en el resumen de una cotización: la miniatura de la imagen de la tarjeta, las pestañas (con los
// comprobantes bajo los adjuntos) y «De este vehículo». Sólo cáscaras con `diferido()`: la pantalla que lo monta no paga su código hasta que se abre. Lo usan el listado y las fichas.
export const HUECOS_DEL_RESUMEN = {
  ...HUECOS_DE_TARJETA_EN_EL_RESUMEN,
  ...HUECOS_DE_COMENTARIOS_EN_EL_RESUMEN,
  ...HUECOS_DE_COMPROBANTES_EN_EL_RESUMEN,
  ...HUECOS_DE_APROBADA_EN_EL_RESUMEN,
}
