'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// Mientras llega el código de un panel: unas líneas en su lugar.
function EsqueletoDelPanel() {
  return (
    <div role="status" aria-label="Cargando" className="grid gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

// El formulario de una compra se pide al abrirse (`useAbiertoAlgunaVez()`): nada de su código viaja con la lista (8.11-3, C12).
export const DrawerDeCompraDiferido = diferido(() =>
  import('./drawer-de-compra').then((modulo) => modulo.DrawerDeCompra),
)

// El bloque «Compras» del panel del ítem: se pide al abrir el panel (sólo con `repuestos.costos.ver`). Si no llega, lo dice en su lugar.
export const ComprasDelItemDiferido = diferido(
  () => import('./bloque-de-compras-del-item').then((modulo) => modulo.BloqueDeComprasDelItem),
  { aviso: 'aqui', esqueleto: <EsqueletoDelPanel /> },
)

// El panel «Compras» bajo los pasos de `/repuestos/[id]`: el margen y la lista se piden al elegirlo, no viajan con la hoja.
export const ComprasDelProyectoDiferido = diferido(
  () => import('./compras-del-proyecto').then((modulo) => modulo.ComprasDelProyecto),
  { aviso: 'aqui', esqueleto: <EsqueletoDelPanel /> },
)

export const MargenDelProyectoDiferido = diferido(
  () => import('./margen-del-proyecto').then((modulo) => modulo.MargenDelProyecto),
  { aviso: 'aqui', esqueleto: <EsqueletoDelPanel /> },
)
