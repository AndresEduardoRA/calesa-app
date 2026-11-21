import 'server-only'
import type { PlantillaDelOrigen } from '../../entities/plantilla/lectura-de-la-plantilla'
import type { Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerPlantillaSobre } from './lectura-sobre'

// La plantilla de una fórmula del origen para editarla, con la sesión de quien mira.
export async function leerPlantillaDelOrigen(
  formulaDelOrigenId: string,
): Promise<Resultado<PlantillaDelOrigen>> {
  return leerPlantillaSobre(await createClient(), formulaDelOrigenId)
}
