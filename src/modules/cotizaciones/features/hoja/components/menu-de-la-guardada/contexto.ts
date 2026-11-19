'use client'

import { createContext, type RefObject } from 'react'
import type { ClaveDeAccionDeCotizacion } from '../../../../entities/acciones-de-cotizacion'

// Una línea que alguien suma al «⋯» de la guardada. `motivo` la deja apagada y lo dice debajo; `ocupada`, apagada sin nota (está en vuelo: «Descargando…»); `etiqueta`
// reemplaza la de la lista («Reportaste esta cotización…»); `abre`, lo que abre algo encima: espera a que el menú se cierre (el foco que vuelve al «⋯» lo cerraría).
export type LineaDelMenu =
  | {
      tipo: 'accion'
      motivo?: string | null
      ocupada?: boolean
      etiqueta?: string
      abre?: boolean
      alElegir: () => void
    }
  | { tipo: 'casilla'; marcada: boolean; ocupada?: boolean; alCambiar: (marcada: boolean) => void }

// Lo que suma un componente: una o varias líneas, por su clave de la lista única (el orden lo da `accionesDeCotizacion()`, nunca quien suma).
export type AporteAlMenu = Readonly<Partial<Record<ClaveDeAccionDeCotizacion, LineaDelMenu>>>

// Lo que no cambia mientras la página vive: sumar o quitar un aporte y el botón del «⋯» (a él vuelve el foco al cerrar lo que se abrió desde el menú). Quien suma lee sólo
// este: si leyera las líneas, cada aporte lo volvería a dibujar y aportaría de nuevo.
export type MenuEstable = {
  aportar: (id: string, aporte: AporteAlMenu | null) => void
  botonRef: RefObject<HTMLButtonElement | null>
}

// Lo que cambia: las líneas juntas y la ranura de «Guardar» ya montada. Lo leen sólo el «⋯» y «Guardar».
export type MenuVivo = {
  lineas: AporteAlMenu
  ranura: HTMLElement | null
}

export const ContextoDelMenuEstable = createContext<MenuEstable | null>(null)

// Cómo la cabecera dice dónde va «Guardar» (el `ref` de su lugar); estable.
export const ContextoDeLaRanura = createContext<((elemento: HTMLElement | null) => void) | null>(
  null,
)

export const ContextoDelMenuVivo = createContext<MenuVivo>({ lineas: {}, ranura: null })
