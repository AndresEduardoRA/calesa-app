'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaFormula } from '../../../areas/formula/composicion'
import { MOTIVO_SIN_PERMISO_DE_FORMULA } from '../../../entities/formula/publicacion'
import { esquemaDeCambiarCabecera } from '../schemas/cabecera'

// El ⚙ de la cabecera desde la hoja: publica la N+1 de la fórmula del origen con el modo por defecto, «Ver total» por defecto y los modos visibles
// (`formula_cambiar_cabecera()`, con la publicada esperada siempre); la base vuelve a pedir `cotizaciones.configurar` del origen y no toca el borrador. Devuelve el id de
// la versión nueva. Sin revalidar ni refrescar, como `cambiar-constante.ts`: la hoja se remontaría con lo tipeado a medias.
export const cambiarCabecera = actionClient
  .inputSchema(esquemaDeCambiarCabecera)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<string>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULA)
    }
    return repositorioDeLaFormula.cambiarCabecera(parsedInput)
  })
