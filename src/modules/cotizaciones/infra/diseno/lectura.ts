import 'server-only'
import type { DisenoParaEditar } from '../../entities/diseno/edicion-del-diseno'
import type { Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerDisenoSobre, leerNivelesSobre } from './lectura-del-diseno'
import { leerTonosSobre } from './lectura-de-tonos'

// El diseño de una fórmula del origen para editarlo, con la sesión de quien mira; nulo si la fórmula todavía no tiene ninguna versión.
export async function leerDisenoDelOrigen(
  formulaDelOrigenId: string,
): Promise<Resultado<DisenoParaEditar | null>> {
  return leerDisenoSobre(await createClient(), formulaDelOrigenId)
}

// Los niveles que el diseño puede nombrar, con la sesión de quien mira.
export async function leerNivelesDelDiseno() {
  return leerNivelesSobre(await createClient())
}

// El catálogo de tonos para editarlo, con la sesión de quien mira.
export async function leerTonosDelCatalogo() {
  return leerTonosSobre(await createClient())
}
