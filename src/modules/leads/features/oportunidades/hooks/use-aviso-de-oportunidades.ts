'use client'

import { useEffect, useState } from 'react'
import { leerOportunidadesDelAviso } from '../../../composicion.client'
import {
  avisoDeOportunidades,
  crearIgual,
  type AvisoDeOportunidades,
  type CrearIgual,
} from '../../../entities/oportunidad-rapida'

export type LecturaDelAviso =
  | { tipo: 'leyendo' }
  | { tipo: 'error' }
  // El lead no tiene ninguna que quien mira vea: el modal abre directo en el formulario.
  | { tipo: 'sin_oportunidades' }
  // `crearIgual`: si ya hay una abierta en el embudo por defecto, apagado con su motivo (una abierta por lead y embudo).
  | { tipo: 'con_oportunidades'; aviso: AvisoDeOportunidades; crearIgual: CrearIgual }

// Lo que el lead ya tiene, leído una vez por apertura del modal (con `abierto`: cerrado, no lee). Un fallo (o no tener red) es un estado, no «sin
// oportunidades»: el modal lo dice con «Reintentar» y deja crear igual.
export function useAvisoDeOportunidades(leadId: string, abierto: boolean) {
  const [lectura, setLectura] = useState<LecturaDelAviso>({ tipo: 'leyendo' })
  const [intento, setIntento] = useState(0)
  const pendiente = lectura.tipo === 'leyendo'
  useEffect(() => {
    if (!abierto || !pendiente) {
      return
    }
    let vigente = true
    void leerOportunidadesDelAviso(leadId)
      .catch(() => null)
      .then((leidas) => {
        if (!vigente) {
          return
        }
        if (!leidas?.ok) {
          setLectura({ tipo: 'error' })
        } else if (leidas.data.oportunidades.length === 0) {
          setLectura({ tipo: 'sin_oportunidades' })
        } else {
          setLectura({
            tipo: 'con_oportunidades',
            aviso: avisoDeOportunidades(leidas.data.oportunidades, leidas.data.hayMas),
            crearIgual: crearIgual(leidas.data.abiertasPorEmbudo),
          })
        }
      })
    return () => {
      vigente = false
    }
  }, [leadId, abierto, pendiente, intento])
  return {
    lectura,
    reintentar: () => {
      setLectura({ tipo: 'leyendo' })
      setIntento((n) => n + 1)
    },
  }
}
