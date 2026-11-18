'use client'

import { useEffect, useRef } from 'react'
import {
  cambiosDeEstado,
  guardarBorradorDeEstado,
  leerBorradorDeEstado,
} from '@/shared/lib/borrador'
import type { EstadoDelTitulo } from '../../../entities/titulo-de-la-cotizacion'

// El borrador del título de la cotización en la pestaña (T307), como `useBorradorDeEstado` pero **sin aviso**: lo repone la hoja con el suyo («Recuperamos lo que habías
// escrito…»), y dos avisos iguales serían ruido; el título repuesto se ve en la barra. Guarda sólo lo que difiere de lo guardado; `activo` falso (quien no lo puede
// escribir) ni guarda ni repone.
export function useBorradorDelTitulo({
  clave,
  estado,
  inicial,
  alReponer,
  activo,
}: {
  clave: string
  estado: EstadoDelTitulo
  inicial: EstadoDelTitulo
  alReponer: (repuesto: EstadoDelTitulo) => void
  activo: boolean
}): { limpiar: () => void } {
  const repuesto = useRef(false)
  const reponer = useRef(alReponer)
  const base = useRef(inicial)
  useEffect(() => {
    reponer.current = alReponer
    base.current = inicial
  })

  // Al abrir (o con otra clave): lo que quedó sin guardar vuelve, si es un estado que se entiende y difiere de lo guardado.
  useEffect(() => {
    repuesto.current = false
    if (!activo) {
      return
    }
    const borrador = leerBorradorDeEstado(window.sessionStorage, clave)
    const leido = { ...base.current, ...borrador }
    if (
      typeof leido.texto === 'string' &&
      typeof leido.manual === 'boolean' &&
      Object.keys(cambiosDeEstado(leido, base.current)).length > 0
    ) {
      reponer.current({ texto: leido.texto, manual: leido.manual })
    }
    repuesto.current = true
  }, [clave, activo])

  // Al escribir: sólo lo que difiere. La primera pasada no cuenta: todavía no se repuso.
  useEffect(() => {
    if (!activo || !repuesto.current) {
      return
    }
    guardarBorradorDeEstado(window.sessionStorage, clave, cambiosDeEstado(estado, inicial))
  }, [clave, estado, inicial, activo])

  return {
    limpiar: () => {
      guardarBorradorDeEstado(window.sessionStorage, clave, {})
    },
  }
}
