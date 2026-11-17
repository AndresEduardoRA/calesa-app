'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import type { ParaMover } from '../../../entities/mover/para-mover'
import { leerParaMoverDe } from '../leer-para-mover-de'
import { esquemaLeerParaMover } from '../schemas/mover'

// Lo que el hueco «Qué falta» muestra de una unidad (`leerParaMoverDe`).
export const leerParaMover = actionClient
  .inputSchema(esquemaLeerParaMover)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ParaMover>> =>
    leerParaMoverDe(parsedInput, ctx.permisos),
  )
