'use server'

import { leerQuienesPuedenRecibir, type PersonasEncontradas } from '@/modules/agenda'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { CAUSA_SIN_ASIGNAR, SIN_PERMISO_DE_DAR_TAREAS } from '../../../entities/mover/textos'
import { esquemaLeerQuienesPueden } from '../schemas/que-falta'

// A quién se le puede pedir lo que falta: quienes tienen la clave en el origen del vehículo, lo ven y reciben tareas (hasta 20, sin quien pide). Pide
// `agenda.tareas.asignar`; la base lo exige otra vez, y que quien pide vea la unidad.
export const leerQuienesPueden = actionClient
  .inputSchema(esquemaLeerQuienesPueden)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<PersonasEncontradas>> => {
    if (!puede(ctx.permisos, 'agenda.tareas.asignar')) {
      return fallo('sin_permiso', SIN_PERMISO_DE_DAR_TAREAS, CAUSA_SIN_ASIGNAR)
    }
    const { vehiculoId, clave, texto } = parsedInput
    return leerQuienesPuedenRecibir({
      permiso: clave,
      vehiculoId,
      ...(texto === undefined ? {} : { texto }),
    })
  })
