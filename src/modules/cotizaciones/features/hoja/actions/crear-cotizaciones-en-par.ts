'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { ok } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { creadorEnPar } from '../../../areas/nucleo/composicion'
import type { ResultadoDeCrear } from '../../../entities/guardado'
import { puedeCotizarEn } from '../../../entities/origenes-para-cotizar'
import { esquemaDeCrearEnPar } from '../schemas/en-par'

// Crear las dos cotizaciones hermanas de una hoja en par (glosario: «Cotizaciones hermanas»). Como `crearCotizacion`: siempre `ok(ResultadoDeCrear)` y sin
// `revalidatePath` (la pantalla cambia sola a lo guardado).
export const crearCotizacionesEnPar = actionClient
  .inputSchema(esquemaDeCrearEnPar)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeCrear>> => {
    if (!puedeCotizarEn(ctx.permisos, parsedInput.origenId)) {
      return ok({ tipo: 'rechazo', motivo: 'sin_acceso' })
    }
    return ok(await creadorEnPar(parsedInput))
  })
