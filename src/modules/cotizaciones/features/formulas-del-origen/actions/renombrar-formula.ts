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
import { esquemaDeRenombrarFormula } from '../schemas/formulas-del-origen'

// Renombra una fórmula del origen (`formula_del_origen_renombrar()`, con la versión vista): la base valida el nombre y el repetido.
// Sin revalidar: la pantalla aplica lo devuelto y vuelve a leer con `router.refresh()`.
export const renombrarFormulaDelOrigen = actionClient
  .inputSchema(esquemaDeRenombrarFormula)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<FormulaCambiada>> => {
    const { origenId, id, esperada, nombre } = parsedInput
    if (!puede(ctx.permisos, 'cotizaciones.configurar', origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULAS)
    }
    return formulasDelOrigenSupabase.renombrar({ id, esperada, nombre })
  })
