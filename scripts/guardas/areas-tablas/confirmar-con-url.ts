// Parte del registro de `<Confirmar>`: las tablas de referencia de cotizaciones. La guarda (`confirmar-con-url.ts`) suma esta parte a `CONFIRMAR_CON_URL` con
// `import.meta.glob('./areas-*/confirmar-con-url.ts')` (`registros-de-carriles.ts`).
import type { ConfirmarConUrl } from '../confirmar-con-url'

export const REGISTRO: Record<string, ConfirmarConUrl> = {
  // `?tabla=<id>&panel=desactivar-tabla`: desactivar una tabla, desde el «⋯» de la lista o del editor.
  'src/modules/cotizaciones/features/tablas/components/desactivar-tabla.tsx': {
    abre: 'src/modules/cotizaciones/features/tablas/components/acciones-de-la-tabla.tsx',
    senal: 'PANEL_DESACTIVAR_TABLA',
  },
}
