'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel de «Vista y opciones» (el popover, la hoja y las secciones) llega al abrirlo por primera vez: la carga de un listado paga sólo el
// botón. Sin red, el aviso va en una barra fija abajo: el panel no tiene lugar propio hasta que abre.
export const PanelDeVistaYOpcionesDiferido = diferido(
  () => import('./panel-de-vista-y-opciones').then((modulo) => modulo.PanelDeVistaYOpciones),
  { aviso: 'pantalla' },
)
