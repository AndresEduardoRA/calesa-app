// Composición del área `plantilla` de `cotizaciones` en el servidor (4.15-4): lo que lee y escribe el editor de la plantilla de la tarjeta. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeLaPlantilla } from '../../entities/plantilla/escritura-de-la-plantilla'
import { plantillaSupabase } from '../../infra/plantilla/escritura'
import { lecturaDeLaTarjetaDeTrabajo } from '../../entities/plantilla/tarjeta-de-trabajo'
import type { LecturaDeLaTarjetaEnVivo } from '../../entities/tarjeta-en-vivo'
import { leerPlantillaDelOrigen as leerLaPlantillaDelOrigen } from '../../infra/plantilla/lectura'

// El borrador, la publicada y lo que las valida (la fórmula publicada y el catálogo de tonos) de una fórmula del origen, con la sesión de quien mira (4.19-3a).
export const leerPlantillaDelOrigen = leerLaPlantillaDelOrigen
// Guardar el borrador, publicarlo con nota y descartarlo, por las RPC del 4.19-1 (4.19-3a).
export const repositorioDeLaPlantilla: RepositorioDeLaPlantilla = plantillaSupabase

// La tarjeta de una fórmula del origen para la tarjeta en vivo de su planilla (`entities/tarjeta-en-vivo.ts`): la misma lectura que la sub-pestaña «Tarjeta»
// (`plantillas_tarjeta`, `formulas` y `tonos` con la sesión de quien mira), en el servidor y en paralelo con la de la fórmula. Nunca rechaza: un fallo es `no_se_leyo`.
export async function leerLaTarjetaDeLaFormula(
  origen: { id: string; nombre: string },
  formulaDelOrigenId: string,
): Promise<LecturaDeLaTarjetaEnVivo> {
  try {
    const leida = await leerLaPlantillaDelOrigen(formulaDelOrigenId)
    return leida.ok ? lecturaDeLaTarjetaDeTrabajo(leida.data, origen) : { estado: 'no_se_leyo' }
  } catch {
    return { estado: 'no_se_leyo' }
  }
}
