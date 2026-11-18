'use client'

import { useEffect, useRef, useState } from 'react'
import { avisarError } from '@/shared/ui/toasts'
import { pedirLaFoto } from '../../../areas/tarjeta/composicion-compartir.client'
import type { FotoParaCompartir } from '../../../entities/tarjeta/compartir/datos-para-compartir'

export type FotoBajada = { foto: FotoParaCompartir; numero: number; blob: Blob }

// Las fotos marcadas de «Compartir la cotización»: tocar una la marca o la desmarca y, al marcarla, se baja su completa (≤ 1.600 px) en segundo plano, porque el menú
// del sistema pide los archivos ya en memoria dentro del gesto. Una que no baja se desmarca y se avisa. Todo, en el orden de la grilla.
export function useFotosMarcadas(fotos: readonly FotoParaCompartir[]) {
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(() => new Set())
  const [bajadas, setBajadas] = useState<ReadonlyMap<string, Blob>>(() => new Map())
  const enVuelo = useRef(new Map<string, AbortController>())

  useEffect(() => {
    const pedidos = enVuelo.current
    return () => {
      for (const control of pedidos.values()) control.abort()
    }
  }, [])

  function bajar(foto: FotoParaCompartir, numero: number) {
    const control = new AbortController()
    enVuelo.current.set(foto.id, control)
    void pedirLaFoto(foto.completa, control.signal).then((resultado) => {
      // Sólo el suyo: desmarcar y volver a marcar deja otro pedido en vuelo para la misma foto.
      if (enVuelo.current.get(foto.id) === control) enVuelo.current.delete(foto.id)
      if (control.signal.aborted) return
      if (resultado.ok) {
        setBajadas((antes) => new Map(antes).set(foto.id, resultado.data))
        return
      }
      setMarcadas((antes) => {
        const nuevas = new Set(antes)
        nuevas.delete(foto.id)
        return nuevas
      })
      avisarError({ codigo: 'inesperado', mensaje: `No se pudo bajar la foto ${String(numero)}.` })
    })
  }

  function alternar(foto: FotoParaCompartir, numero: number) {
    const nuevas = new Set(marcadas)
    if (nuevas.has(foto.id)) {
      nuevas.delete(foto.id)
      enVuelo.current.get(foto.id)?.abort()
      enVuelo.current.delete(foto.id)
    } else {
      nuevas.add(foto.id)
      if (!bajadas.has(foto.id)) bajar(foto, numero)
    }
    setMarcadas(nuevas)
  }

  const listas: FotoBajada[] = []
  let cuantas = 0
  fotos.forEach((foto, i) => {
    if (!marcadas.has(foto.id)) return
    cuantas += 1
    const blob = bajadas.get(foto.id)
    if (blob !== undefined) listas.push({ foto, numero: i + 1, blob })
  })
  return { marcadas, alternar, cuantas, listas }
}
