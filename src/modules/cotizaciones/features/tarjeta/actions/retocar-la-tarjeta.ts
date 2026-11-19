'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { guardarLosRetoques } from '../../../areas/tarjeta/composicion'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { mensajeDeTextoDeLaBase, revisarTextoParaLaBase } from '../../../entities/texto-de-la-base'
import { esquemaDeRetoques } from '../schemas/retoques'

// Retoca la tarjeta de una cotización guardada (`cotizacion_retocar_tarjeta()`): la base pide poder guardarla (antes y después del candado), la versión y que los
// retoques valgan contra la plantilla publicada de hoy. Antes de llamarla se ataja lo que no puede leer (un `\u0000`, un surrogate suelto). Si entró, revalida la
// página de la cotización: la hoja necesita la versión nueva para su próximo «Guardar», y se vuelve a montar por su `key` sin perder nada porque «Retocar» sólo se
// ofrece con la hoja sin cambios (docs/DECISIONES.md).
export const retocarLaTarjeta = actionClient
  .inputSchema(esquemaDeRetoques)
  .action(
    async ({
      parsedInput,
    }): Promise<ResultadoDeAccion<{ actualizadoEn: string; repetido: boolean }>> => {
      const problema = revisarTextoParaLaBase(parsedInput.retoques, { raiz: 'retoques' })
      if (problema !== null) {
        return {
          ok: false,
          error: {
            codigo: 'validacion',
            mensaje: mensajeDeTextoDeLaBase(problema),
            causa: problema.donde,
          },
        }
      }
      const hecho = await guardarLosRetoques({
        id: parsedInput.cotizacionId,
        esperado: parsedInput.actualizadoEnEsperado,
        retoques: parsedInput.retoques,
      })
      if (!hecho.ok) {
        return hecho
      }
      revalidatePath(rutaDeLaCotizacion(parsedInput.cotizacionId))
      return {
        ok: true,
        data: { actualizadoEn: hecho.data.actualizadoEn, repetido: hecho.data.repetido },
      }
    },
  )
