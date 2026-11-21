'use server'

import { puede } from '@/shared/lib/permisos'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { cambiadorDePrivada } from '../../../areas/nucleo/composicion'
import type { ResultadoDePrivada } from '../../../entities/privada'
import { esquemaCambiarPrivada } from '../schemas/cambiar-privada'

// Hace privada o pública una cotización (glosario: «Cotización privada»). Sin ver cotizaciones en algún origen no se llama a la base; que sea quien la creó, la versión,
// una final y la aprobada los mira la base, que devuelve el motivo para la persona. **No revalida**: quien llama refresca (el listado) o vuelve a leer la guardada.
export const cambiarPrivadaDeLaCotizacion = actionClient
  .inputSchema(esquemaCambiarPrivada)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDePrivada>> => {
    if (!puede(ctx.permisos, 'cotizaciones.ver')) {
      return fallo('sin_permiso', 'No tienes permiso para ver cotizaciones.')
    }
    return cambiadorDePrivada(parsedInput)
  })
