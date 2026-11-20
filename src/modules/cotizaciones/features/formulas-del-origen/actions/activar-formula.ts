'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { formulasDelOrigenSupabase } from '../../../areas/formulas-del-origen/composicion'
import {
  MOTIVO_SIN_PERMISO_DE_FORMULAS,
  type FormulaActivada,
} from '../../../entities/formulas-del-origen/resultado'
import { esquemaDeActivarFormula } from '../schemas/formulas-del-origen'

// Activa una fórmula del origen (`formula_del_origen_activar()`): publica con la nota los borradores de la fórmula y de la tarjeta, valida la tarjeta contra la versión que se va a cotizar y la vuelve la activa. Cada esperada es lo que se vio: si algo cambió, PT409.
// Sin revalidar: la pantalla aplica lo devuelto y vuelve a leer con `router.refresh()`.
export const activarFormulaDelOrigen = actionClient
  .inputSchema(esquemaDeActivarFormula)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<FormulaActivada>> => {
    const { origenId, ...pedido } = parsedInput
    if (!puede(ctx.permisos, 'cotizaciones.configurar', origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULAS)
    }
    return formulasDelOrigenSupabase.activar(pedido)
  })
