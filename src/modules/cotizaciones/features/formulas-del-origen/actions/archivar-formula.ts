'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { formulasDelOrigenSupabase } from '../../../areas/formulas-del-origen/composicion'
import {
  MOTIVO_SIN_PERMISO_DE_FORMULAS,
  type FormulaCambiada,
} from '../../../entities/formulas-del-origen/resultado'
import { esquemaDeArchivarFormula } from '../schemas/formulas-del-origen'

// Archiva una fórmula del origen que estuvo activa (`formula_del_origen_archivar()`, con la versión vista): la activa no se archiva.
// Sin revalidar: la pantalla aplica lo devuelto y vuelve a leer con `router.refresh()`.
export const archivarFormulaDelOrigen = actionClient
  .inputSchema(esquemaDeArchivarFormula)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<FormulaCambiada>> => {
    const { origenId, id, esperada } = parsedInput
    if (!puede(ctx.permisos, 'cotizaciones.configurar', origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULAS)
    }
    return formulasDelOrigenSupabase.archivar({ id, esperada })
  })
