'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { MENSAJE_COMPRAS_DEL_ITEM } from '../../../entities/compras/errores'
import { leerComprasDelItem } from '../actions/leer-compras-del-item'

// Las compras del ítem que muestra su panel: se leen al montarse el bloque (nunca con la hoja), con «Reintentar» si falla. El panel se remonta al abrirse.
export function useComprasDelItem(itemId: string) {
  return useLecturaAlMontar(
    () => enviarAccion(leerComprasDelItem({ itemId }), MENSAJE_COMPRAS_DEL_ITEM),
    itemId,
  )
}
