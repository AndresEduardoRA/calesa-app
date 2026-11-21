'use client'

import { useEffect, useRef } from 'react'
import { CLAVE_DE_LA_FILA_PEDIDA } from '../../../entities/llegada-al-editor'

// La fila que pide la URL al abrir la planilla (`…/planilla?fila=<id del nodo>`, el «Ir a la fila» del rechazo de «Activar»): se lee **una vez**, al montar (en
// un efecto: al hidratar no hay `window`), se entrega a `alPedir` y se borra de la URL sin navegar, para que volver a dibujar no la vuelva a elegir.
export function useFilaPedida(alPedir: (id: string) => void) {
  const leida = useRef(false)
  useEffect(() => {
    if (leida.current) return
    leida.current = true
    const url = new URL(window.location.href)
    const id = url.searchParams.get(CLAVE_DE_LA_FILA_PEDIDA)
    if (id === null || id === '') return
    url.searchParams.delete(CLAVE_DE_LA_FILA_PEDIDA)
    window.history.replaceState(window.history.state, '', url)
    alPedir(id)
  }, [alPedir])
}
