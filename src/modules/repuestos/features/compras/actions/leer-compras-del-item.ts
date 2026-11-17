'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { comprasDelItem } from '../../../areas/compras/composicion'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import { SIN_PERMISO_PARA_VER_COMPRAS } from '../../../entities/compras/errores'
import { esquemaLeerComprasDelItem } from '../schemas/compra'

// Las compras de un ítem al abrir su panel. Son costos: sin `repuestos.costos.ver` no llega a la base (la RLS lo vuelve a exigir y devolvería cero filas).
export const leerComprasDelItem = actionClient
  .inputSchema(esquemaLeerComprasDelItem)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<ResultadoDeAccion<{ filas: FilaDeCompra[]; hayMas: boolean }>> => {
      if (!puede(ctx.permisos, 'repuestos.costos.ver')) {
        return fallo('sin_permiso', SIN_PERMISO_PARA_VER_COMPRAS)
      }
      return comprasDelItem(parsedInput.itemId)
    },
  )
