'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioLeyendaDeTiposCambio } from '../../../composicion'
import { normalizarLeyenda } from '../../../entities/compartir-tipos-cambio'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import { esquemaGuardarLeyendaDeTiposCambio } from '../schemas/leyenda'

// La leyenda que va al pie de lo que se comparte con un cliente. Vacía la quita. La base vuelve a exigir el permiso, el largo y la versión.
export const guardarLeyendaDeTiposCambio = actionClient
  .inputSchema(esquemaGuardarLeyendaDeTiposCambio)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.tipos_cambio.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_TIPOS_CAMBIO)
    }
    const guardado = await repositorioLeyendaDeTiposCambio.guardar({
      leyenda: normalizarLeyenda(parsedInput.leyenda),
      actualizadoEnEsperado: parsedInput.actualizadoEnEsperado,
    })
    if (guardado.ok) {
      // La versión de la fila la llevan también el formulario de Empresa y sus íconos.
      revalidatePath(RUTAS.empresa)
    }
    return guardado
  })
