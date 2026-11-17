'use client'

import { useEffect, useRef } from 'react'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'

// Lo que pasa en el dinero de una unidad se avisa por el navegador, no por la URL: el hueco «Gastos» guarda y el hueco «Margen», que es de la misma unidad, vuelve a leer (6.11-1).
const EVENTO = 'logistica:dinero-de-la-unidad'

// También es un cambio de la unidad: «Qué falta» se relee (un pago confirmado o un gasto de tributos cumplen requisitos). Un id de proyecto no lo escucha nadie.
export function avisarCambioDeDinero(unidadId: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENTO, { detail: unidadId }))
  avisarCambioDeLaUnidad(unidadId)
}

// Llama `alCambiar` cada vez que cambia el dinero de esa unidad.
export function useAlCambiarElDinero(unidadId: string, alCambiar: () => void): void {
  const ultima = useRef(alCambiar)
  useEffect(() => {
    ultima.current = alCambiar
  })
  useEffect(() => {
    const oyente = (evento: Event) => {
      if (evento instanceof CustomEvent && evento.detail === unidadId) {
        ultima.current()
      }
    }
    window.addEventListener(EVENTO, oyente)
    return () => {
      window.removeEventListener(EVENTO, oyente)
    }
  }, [unidadId])
}

// Llama `alCambiar` cada vez que cambia el dinero de un proyecto de repuestos (registrar, corregir, eliminar, confirmar o anular uno de sus pagos): la página del proyecto
// vuelve a pedirse al servidor para que sus pasos digan si ya hay pago.
export const useAlCambiarElDineroDelProyecto = useAlCambiarElDinero
