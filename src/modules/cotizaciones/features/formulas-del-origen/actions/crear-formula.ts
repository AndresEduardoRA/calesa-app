'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { formulasDelOrigenSupabase } from '../../../areas/formulas-del-origen/composicion'
import {
  MOTIVO_SIN_PERMISO_DE_FORMULAS,
  MOTIVO_SIN_PERMISO_DE_LA_COPIA,
  type FormulaCreada,
} from '../../../entities/formulas-del-origen/resultado'
import { esquemaDeCrearFormula } from '../schemas/formulas-del-origen'

// Crea una fórmula del origen en blanco o copia de otra (`formula_del_origen_crear()`): la base valida el nombre, el tope y la pieza, y vuelve a pedir el
// permiso en los dos orígenes. Sin revalidar: la lista vuelve a leerse con `router.refresh()` y la planilla nueva se abre con lo que la base devolvió.
export const crearFormulaDelOrigen = actionClient
  .inputSchema(esquemaDeCrearFormula)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<FormulaCreada>> => {
    const { origenDeLaCopia, ...pedido } = parsedInput
    if (!puede(ctx.permisos, 'cotizaciones.configurar', pedido.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULAS)
    }
    if (
      pedido.copiaDe !== null &&
      (origenDeLaCopia === null || !puede(ctx.permisos, 'cotizaciones.configurar', origenDeLaCopia))
    ) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_LA_COPIA)
    }
    return formulasDelOrigenSupabase.crear(pedido)
  })
