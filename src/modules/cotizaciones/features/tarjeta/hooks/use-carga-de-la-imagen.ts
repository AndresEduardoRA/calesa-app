'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { crearCola, type TurnoDeLaCola } from '@/shared/lib/cola'

// A lo sumo cuatro imágenes de la tarjeta pidiéndose a la vez en la página (`docs/RENDIMIENTO.md` › «Imagen de la tarjeta»): sin la cola, una lista de 50
// tarjetas son 50 armados en paralelo en el servidor.
const IMAGENES_A_LA_VEZ = 4
const COLA = crearCola(IMAGENES_A_LA_VEZ)

export type CargaDeLaImagen = 'cargando' | 'lista' | 'fallo'

// Cómo va la imagen de la tarjeta y su turno en la cola de la página. Mientras está `aLaVista` y sin cargar, pide turno; si sale de la vista antes de que le
// toque, deja la fila. Con el turno, `conTurno` (recién ahí la imagen pone su `src`), que devuelve al cargar (`alCargar`), al fallar (`alFallar`) o al
// desmontarse. «Reintentar» (`reintentar`) suma `intento` (otra URL) y vuelve a la fila.
export function useCargaDeLaImagen(aLaVista: boolean) {
  const [carga, setCarga] = useState<CargaDeLaImagen>('cargando')
  const [intento, setIntento] = useState(0)
  const [conTurno, setConTurno] = useState(false)
  const turnoRef = useRef<TurnoDeLaCola | null>(null)
  const pedir = aLaVista && carga === 'cargando'

  useEffect(() => {
    if (!pedir || conTurno) return undefined
    const pedido = COLA.pedir()
    let vigente = true
    void pedido.turno.then(() => {
      if (!vigente) return
      turnoRef.current = pedido
      setConTurno(true)
    })
    return () => {
      vigente = false
      // Con el turno recién dado, el efecto se limpia por `conTurno`: ése lo devuelve `soltar()`.
      if (turnoRef.current !== pedido) pedido.soltar()
    }
  }, [pedir, conTurno])

  const soltar = useCallback(() => {
    turnoRef.current?.soltar()
    turnoRef.current = null
  }, [])

  // Desmontarse con el turno (la imagen cargando) lo devuelve.
  useEffect(() => soltar, [soltar])

  return {
    carga,
    intento,
    conTurno,
    alCargar: () => {
      soltar()
      setCarga('lista')
    },
    alFallar: () => {
      soltar()
      setCarga('fallo')
    },
    reintentar: () => {
      soltar()
      setConTurno(false)
      setCarga('cargando')
      setIntento((n) => n + 1)
    },
  }
}
