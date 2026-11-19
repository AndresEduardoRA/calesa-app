// Los `<Drawer>` del área de la fórmula (4.20-3b): parte del registro de `DRAWERS` (`drawers-con-salida.ts`), que los suma tras los del
// núcleo.
import type { RegistroDeDrawer } from './drawers-con-salida'

export const DRAWERS_DE_LA_FORMULA: Record<string, RegistroDeDrawer> = {
  // El ⚙ de una constante en la hoja (4.20-3b): lo tipeado no tiene borrador, así que el cuerpo (una sola llamada para todo el panel) pide `preguntaAlCerrar`.
  'src/modules/cotizaciones/features/formula/components/hoja/panel-del-ajuste.tsx': {
    formulario: 'src/modules/cotizaciones/features/formula/components/hoja/cuerpo-del-ajuste.tsx',
    mecanismo: 'contexto',
  },
  // El ⚙ de la cabecera: lo elegido no tiene borrador; el cuerpo pide `preguntaAlCerrar` y su pie es `<PieDelPanel>`.
  'src/modules/cotizaciones/features/formula/components/hoja/panel-del-ajuste-de-la-cabecera.tsx': {
    formulario:
      'src/modules/cotizaciones/features/formula/components/hoja/cuerpo-del-ajuste-de-la-cabecera.tsx',
    mecanismo: 'contexto',
  },
}
