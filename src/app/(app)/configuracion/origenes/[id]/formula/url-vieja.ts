import { rutaDeLaFormula, rutaDeLasFormulas, type ParteDeLaFormula } from '@/shared/lib/rutas'
import { sinLosPanelesQueYaNoExisten } from '@/shared/lib/paneles-que-ya-no-existen'
import { conParametros, type ParametrosDeLaUrl } from '../../../con-parametros'

// A dónde llevan las rutas de cuando un origen tenía una sola fórmula (`…/<id>/formula`, `…/formula/hoja`, `…/formula/tarjeta`, la «ruta corta» que aún arman
// `rutaDeConfiguracionDeCotizacion()` y los enlaces viejos): a esa parte de la **fórmula de trabajo** (la activa o, sin activa, la más nueva sin archivar), con toda
// su consulta (`?panel=`, `?version=`, `?vista=`) salvo los paneles que ya no existen, el del Modo avanzado y «Empezar desde una plantilla» (así llega en un solo salto). Sin ninguna (o si quien pide no
// la ve), a la lista de las fórmulas, sin consulta: los paneles eran del editor.
export function destinoDeLaFormulaVieja(
  origenId: string,
  parte: ParteDeLaFormula,
  trabajoId: string | null,
  parametros: ParametrosDeLaUrl,
): string {
  if (trabajoId === null) {
    return rutaDeLasFormulas(origenId)
  }
  return conParametros(
    rutaDeLaFormula(origenId, trabajoId, parte),
    sinLosPanelesQueYaNoExisten(parametros),
    [],
  )
}
