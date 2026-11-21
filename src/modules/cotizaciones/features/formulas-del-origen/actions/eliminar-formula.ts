'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { formulasDelOrigenSupabase } from '../../../areas/formulas-del-origen/composicion'
import {
  MOTIVO_SIN_PERMISO_DE_FORMULAS,
  type FormulaEliminada,
} from '../../../entities/formulas-del-origen/resultado'
import { esquemaDeEliminarFormula } from '../schemas/formulas-del-origen'

// Elimina una fórmula del origen que nunca estuvo activa ni se usó (`formula_del_origen_eliminar()`, con la versión vista): una usada responde 23503 y se archiva.
// Sin revalidar: la pantalla aplica lo devuelto y vuelve a leer con `router.refresh()`.
export const eliminarFormulaDelOrigen = actionClient
  .inputSchema(esquemaDeEliminarFormula)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<FormulaEliminada>> => {
    const { origenId, id, esperada } = parsedInput
    if (!puede(ctx.permisos, 'cotizaciones.configurar', origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULAS)
    }
    return formulasDelOrigenSupabase.eliminar({ id, esperada })
  })
