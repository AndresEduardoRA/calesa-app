'use server'

import { darTareaVinculada, type ResultadoDeEscritura } from '@/modules/agenda'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { CAUSA_SIN_ASIGNAR, SIN_PERMISO_DE_DAR_TAREAS } from '../../../entities/mover/textos'
import { esquemaPedirLoQueFalta } from '../schemas/que-falta'

// «Pedirlo»: una tarea sin fecha para quien puede destrabar lo que falta, vinculada al vehículo (avisa `tarea_asignada`). Pide `agenda.tareas.asignar`; la base
// lo exige otra vez, que el responsable pueda recibir (23514 hint `responsable_id`) y que quien pide vea el vehículo. Idempotente por el id del intento.
export const pedirLoQueFalta = actionClient
  .inputSchema(esquemaPedirLoQueFalta)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeEscritura>> => {
    if (!puede(ctx.permisos, 'agenda.tareas.asignar')) {
      return fallo('sin_permiso', SIN_PERMISO_DE_DAR_TAREAS, CAUSA_SIN_ASIGNAR)
    }
    return darTareaVinculada(parsedInput)
  })
