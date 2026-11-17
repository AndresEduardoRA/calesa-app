'use client'

import { createContext, useContext } from 'react'

export type ControlDeVistaYOpciones = {
  // Cierra el panel; el foco vuelve al botón.
  cerrar: () => void
  // Cierra el panel y corre `accion` cuando terminó de cerrarse (el foco ya volvió al botón): así lo que abre otro panel marca al botón
  // como quien lo abrió y el foco que Base UI devuelve tarde no le roba letras al panel nuevo (`docs/LECCIONES.md` › Interfaz).
  cerrarYLuego: (accion: () => void) => void
}

const SIN_PANEL: ControlDeVistaYOpciones = {
  cerrar: () => undefined,
  cerrarYLuego: (accion) => {
    accion()
  },
}

export const ContextoDeVistaYOpciones = createContext<ControlDeVistaYOpciones>(SIN_PANEL)

// Lo que un control de adentro del panel usa para cerrarlo. Fuera del panel, `cerrar` no hace nada y `cerrarYLuego` corre la acción.
export function useVistaYOpciones(): ControlDeVistaYOpciones {
  return useContext(ContextoDeVistaYOpciones)
}
