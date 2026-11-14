'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del vehículo se pide recién al abrirse: la hoja de cotizar no carga su código para dibujar la barra. Se monta con
// `useAbiertoAlgunaVez()`.
export const PanelDelVehiculoDiferido = diferido(() =>
  import('./panel-del-vehiculo').then((modulo) => modulo.PanelDelVehiculo),
)

// El alta de adentro del panel (`?alta=`) se pide recién al abrirla: ni el formulario del vehículo ni el pegado de la subasta van con el panel.
export const AltaDesdeElPanelDiferida = diferido(() =>
  import('./alta-desde-el-panel').then((modulo) => modulo.AltaDesdeElPanel),
)

// El aviso de la subasta cerrada de la hoja (va en la carga en frío de `/cotizaciones/nuevo`, al borde de su presupuesto de JS): su código se pide sólo
// cuando hay un aviso que dibujar. Mientras llega, un hueco de su alto para que la hoja no salte.
export const AvisoDeSubastaCerradaDiferido = diferido(
  () => import('./aviso-de-subasta-cerrada').then((modulo) => modulo.AvisoDeSubastaCerrada),
  {
    esqueleto: (
      <div aria-hidden className="h-24 rounded-(--radius-md) bg-(--color-surface-3) md:h-16" />
    ),
  },
)
