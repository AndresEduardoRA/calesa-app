'use client'

import { diferido } from '@/shared/ui/diferido'

// El contenido del popover de tipos de cambio de la barra (la lectura con supabase-js, el editor del valor y la action) se pide al abrirlo:
// el marco de toda pantalla no carga su código. Sin red, «Sin conexión» con «Reintentar» dentro del popover.
export const ContenidoDeTiposCambioDiferido = diferido(
  () => import('./contenido-de-tipos-cambio').then((m) => m.ContenidoDeTiposCambio),
  { aviso: 'aqui' },
)

// «Compartir» (las casillas, la vista previa y los botones) se pide al tocarlo: quien sólo mira los valores no lo paga.
export const PanelDeCompartirDiferido = diferido(
  () => import('./compartir/panel-de-compartir').then((m) => m.PanelDeCompartir),
  { aviso: 'aqui' },
)

// Pide el código sin abrir nada, al llegar el puntero al botón (no al tomar el foco: un recorrido con Tab no suma pedidos). Un fallo acá
// no se dice: nadie pidió nada todavía.
export function adelantarElContenido() {
  void import('./contenido-de-tipos-cambio').catch(() => undefined)
}
