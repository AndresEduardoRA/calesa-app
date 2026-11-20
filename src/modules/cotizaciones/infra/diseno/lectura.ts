import 'server-only'
import type { DisenoParaEditar } from '../../entities/diseno/edicion-del-diseno'
import { ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerFormulaDeTrabajoSobre } from '../queries/formula-de-trabajo'
import { leerDisenoSobre, leerNivelesSobre } from './lectura-del-diseno'
import { leerTonosSobre } from './lectura-de-tonos'

// El diseño de la fórmula de trabajo de un origen para editarlo, con la sesión de quien mira; nulo si el origen todavía no tiene fórmula.
export async function leerDisenoDelOrigen(
  origenId: string,
): Promise<Resultado<DisenoParaEditar | null>> {
  const cliente = await createClient()
  const deTrabajo = await leerFormulaDeTrabajoSobre(cliente, origenId)
  if (!deTrabajo.ok) return deTrabajo
  return deTrabajo.data === null ? ok(null) : leerDisenoSobre(cliente, deTrabajo.data.id)
}

// Los niveles que el diseño puede nombrar, con la sesión de quien mira.
export async function leerNivelesDelDiseno() {
  return leerNivelesSobre(await createClient())
}

// El catálogo de tonos para editarlo, con la sesión de quien mira.
export async function leerTonosDelCatalogo() {
  return leerTonosSobre(await createClient())
}
