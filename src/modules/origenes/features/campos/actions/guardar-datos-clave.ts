'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioOrigenes } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaGuardarDatosClave } from '../schemas/datos-clave'

// Los datos clave de un origen, enteros y de a un cambio. La base valida la lista, la versión del origen y que cada campo siga activo.
export const guardarDatosClave = actionClient
  .inputSchema(esquemaGuardarDatosClave)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const guardado = await repositorioOrigenes.guardarDatosClave(parsedInput)
    if (guardado.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return guardado
  })
