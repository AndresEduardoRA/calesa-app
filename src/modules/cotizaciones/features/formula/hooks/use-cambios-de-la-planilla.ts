'use client'

import { useCallback } from 'react'
import type { Formula } from '../../../entities/formula'
import {
  cambiarValorDeConstante,
  type ValorCambiado,
} from '../../../entities/formula/valor-en-la-planilla'

const ESPERA_AL_CAMBIAR = 'Aplica o descarta el texto de la barra de fórmula.'

type Args = {
  trabajo: Formula
  // Nada abierto ni guardándose (el `libre` del editor).
  libre: boolean
  // Un grupo abierto o un guardado en curso: «Sumar fila debajo» espera.
  ocupado: boolean
  // Los `set` del editor y los de «Sumar fila»: estables.
  setTrabajo: (formula: Formula) => void
  setAbierta: (abierta: null) => void
  nueva: { soltarLaCreada: () => void; abrirFormulario: (tras: string) => void }
}

// Lo que la planilla de la fórmula suma al editor: cambiar el valor de una constante en su celda (C, o B en un `porcentaje_de`) y «Sumar fila debajo» desde la
// barra de fórmula. Los dos sobre la misma fórmula de trabajo, con las guardas de hoy.
export function useCambiosDeLaPlanilla(a: Args) {
  const { trabajo, libre, ocupado, setTrabajo, setAbierta } = a
  const { soltarLaCreada, abrirFormulario } = a.nueva
  // Como un «Aplicar», sólo con nada abierto ni guardándose. Lo que no entra no cambia nada y dice por qué.
  const cambiarValor = useCallback(
    (id: string, valor: number): ValorCambiado => {
      if (!libre) return { ok: false, mensaje: ESPERA_AL_CAMBIAR }
      const r = cambiarValorDeConstante(trabajo, id, valor)
      if (r.ok && r.formula !== trabajo) {
        soltarLaCreada()
        setTrabajo(r.formula)
      }
      return r
    },
    [libre, trabajo, soltarLaCreada, setTrabajo],
  )
  // Suelta la fila abierta y abre el formulario en el mismo manejador (sin esperar al render que la suelta: `hayAbierta` aún sería el de antes).
  const sumarDebajo = useCallback(
    (id: string) => {
      if (ocupado) return
      setAbierta(null)
      abrirFormulario(id)
    },
    [ocupado, setAbierta, abrirFormulario],
  )
  return { cambiarValor, sumarDebajo }
}
