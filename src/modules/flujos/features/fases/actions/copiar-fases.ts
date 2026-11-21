'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { copiadorDeFases } from '../../../areas/fases/composicion'
import type { RespuestaDeCopiarFases } from '../../../entities/fases/copiar-fases'
import { esquemaCopiarFases } from '../schemas/copiar-fases'
import { motivoSinPermisoDeFases, sinPermisoDeFases } from './resultado'

// Empieza el flujo de un origen con las fases de otro: `flujos.configurar` en los dos orígenes (la base lo vuelve a exigir y manda).
export const copiarFases = actionClient
  .inputSchema(esquemaCopiarFases)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeCopiarFases>> => {
    const motivo = motivoSinPermisoDeFases(ctx.permisos, parsedInput.origenId)
    if (motivo !== null) {
      return sinPermisoDeFases(motivo)
    }
    if (!puede(ctx.permisos, 'flujos.configurar', parsedInput.desdeOrigenId)) {
      return fallo('sin_permiso', 'No puedes configurar el flujo de ese origen.')
    }
    const hecho = await copiadorDeFases(parsedInput)
    if (hecho.ok) {
      // La pantalla relee el flujo: la RPC no devuelve las fases. Vehículos lee las fases del origen.
      revalidatePath(RUTAS.origenes, 'layout')
      revalidatePath(RUTAS.vehiculos, 'layout')
    }
    return hecho
  })
