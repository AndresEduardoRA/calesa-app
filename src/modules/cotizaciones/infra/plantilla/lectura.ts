import 'server-only'
import type { PlantillaDelOrigen } from '../../entities/plantilla/lectura-de-la-plantilla'
import type { Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerFormulaDeTrabajoSobre } from '../queries/formula-de-trabajo'
import { leerPlantillaSobre } from './lectura-sobre'

// La plantilla de la fórmula de trabajo de un origen para editarla, con la sesión de quien mira.
export async function leerPlantillaDelOrigen(
  origenId: string,
): Promise<Resultado<PlantillaDelOrigen>> {
  const cliente = await createClient()
  const deTrabajo = await leerFormulaDeTrabajoSobre(cliente, origenId)
  if (!deTrabajo.ok) return deTrabajo
  return leerPlantillaSobre(cliente, deTrabajo.data?.id ?? null)
}
