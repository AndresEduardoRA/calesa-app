'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { ok } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { cotizadorEncimaEnPar } from '../../../areas/nucleo/composicion'
import type { ResultadoDeEncima } from '../../../entities/resultado-de-encima'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { esquemaDeEncimaEnPar } from '../../hoja/schemas/en-par'

// Cotizar encima de dos hermanas (glosario: «Cotizaciones hermanas»): crea el par nuevo en el acto; vuelve la nueva de la que se abrió.
export const cotizarEncimaEnPar = actionClient
  .inputSchema(esquemaDeEncimaEnPar)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEncima>> => {
    const resultado = await cotizadorEncimaEnPar(parsedInput)
    if (resultado.tipo === 'creada') {
      for (const id of parsedInput.anteriores) revalidatePath(rutaDeLaCotizacion(id))
    }
    return ok(resultado)
  })
