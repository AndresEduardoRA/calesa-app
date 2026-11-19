'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { ok } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { guardadorEnPar } from '../../../areas/nucleo/composicion'
import type { ResultadoDeCrear } from '../../../entities/guardado'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { esquemaDeGuardarEnPar } from '../schemas/en-par'

// Guardar las dos cotizaciones hermanas (glosario: «Cotizaciones hermanas»): quién puede lo decide la base, para cada una. Revalida las dos rutas sólo si entró.
export const guardarCotizacionesEnPar = actionClient
  .inputSchema(esquemaDeGuardarEnPar)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeCrear>> => {
    const resultado = await guardadorEnPar(parsedInput.pedido, parsedInput.etiquetas)
    if (resultado.tipo === 'guardada') {
      for (const id of parsedInput.pedido.ids) revalidatePath(rutaDeLaCotizacion(id))
    }
    return ok(resultado)
  })
