'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeOportunidades } from '../../../composicion'
import type { ResultadoDeOportunidad } from '../../../entities/repositorios-de-oportunidades'
import { comoResultadoDeOportunidad } from './resultado'
import { esquemaVersionDeOportunidad } from '../schemas/oportunidades'

// Elimina una oportunidad propia (lógico: vuelve con «Deshacer»).
export const eliminarOportunidad = actionClient
  .inputSchema(esquemaVersionDeOportunidad)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeOportunidad>> =>
    comoResultadoDeOportunidad(await repositorioDeOportunidades.eliminar(parsedInput)),
  )
