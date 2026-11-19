import { datosO } from '@/shared/lib/errores'
import { leerFormulaDelOrigen } from '../../../areas/formula/composicion'
import { FormulaDelOrigen } from './formula-del-origen'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
}

// La pestaña «Fórmula» de un origen en Configuración › Cotización (4.20-2a), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: la
// publicada, el borrador y la primera página de versiones. La base vuelve a decidir (policy `formulas: leer`). Una lectura que falla sube al `error.tsx` de la
// ruta, que ofrece «Reintentar».
export async function SeccionDeLaFormula({ origen }: Props) {
  const formula = datosO(await leerFormulaDelOrigen(origen.id))
  return <FormulaDelOrigen origen={origen} formula={formula} />
}
