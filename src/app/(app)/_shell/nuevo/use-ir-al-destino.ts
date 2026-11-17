'use client'

import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { parseAsString, useQueryStates } from 'nuqs'
import { useAbrirNuevoLead } from '@/modules/leads/shell.client'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { CATALOGO_DE_NUEVO, panelEnLaMismaPantalla, type ClaveDeNuevo } from './catalogo'

// Lo que corre después de cerrar el modal: Base UI le devuelve el foco a quien lo abrió al cerrar; el drawer que se abre después espera a que lo haya hecho
// para que su foco no lo pise (igual que la paleta).
const DESPUES_DE_CERRAR_MS = 0

// A dónde lleva una opción de «Nuevo»: el drawer del lead en la pantalla de ahora, otra pantalla o, si es la misma (evento y tarea en la agenda), sólo su
// `?panel=`, con una sola escritura por nuqs que cambia el del modal por el del alta y conserva lo demás de la URL (un `router.push` la pisaría).
export function useIrAlDestino() {
  const router = useRouter()
  const rutaActual = usePathname()
  const abrirNuevoLead = useAbrirNuevoLead()
  const [, escribirPanel] = useQueryStates({ [CLAVE_DE_PANEL]: parseAsString })
  return (clave: ClaveDeNuevo) => {
    const destino = CATALOGO_DE_NUEVO[clave].destino
    const enLaMisma = panelEnLaMismaPantalla(destino, rutaActual)
    if (enLaMisma) {
      void escribirPanel({ [CLAVE_DE_PANEL]: enLaMisma }, { history: 'replace' })
    } else if (destino.tipo === 'ruta') {
      router.push(destino.ruta as Route)
    } else if (destino.tipo === 'drawer-de-lead') {
      setTimeout(abrirNuevoLead, DESPUES_DE_CERRAR_MS)
    }
  }
}
