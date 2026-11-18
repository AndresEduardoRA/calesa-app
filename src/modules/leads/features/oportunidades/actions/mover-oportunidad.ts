'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeOportunidades } from '../../../composicion'
import type { ResultadoDeOportunidad } from '../../../entities/repositorios-de-oportunidades'
import { comoResultadoDeOportunidad } from './resultado'
import { esquemaMoverOportunidad } from '../schemas/oportunidades'

// «Mover a…»: con la etapa que tenía en pantalla. Si ya está en otra, `conflicto` con «Recargar».
export const moverOportunidad = actionClient
  .inputSchema(esquemaMoverOportunidad)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeOportunidad>> =>
    comoResultadoDeOportunidad(await repositorioDeOportunidades.mover(parsedInput)),
  )
