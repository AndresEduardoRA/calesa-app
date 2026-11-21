'use client'

import { useEffect, useRef, useState, type PointerEvent as EventoDePuntero } from 'react'

export type LadoAlSoltar = 'antes' | 'despues'
export type SobreLaFila = { readonly id: string; readonly lado: LadoAlSoltar }
export type Arrastre = { readonly id: string; readonly sobre: SobreLaFila | null }

// Con el mouse, arrastrar empieza al moverse 4 px; con el dedo, tras 250 ms quieto (antes, el dedo desplaza la planilla).
const UMBRAL_DEL_MOUSE = 4
const ESPERA_DEL_DEDO = 250
const TOLERANCIA_DEL_DEDO = 8

// La fila bajo el puntero y si cae antes o después de ella (por la mitad de su alto).
function sobreEn(x: number, y: number): SobreLaFila | null {
  const tr = document.elementFromPoint(x, y)?.closest<HTMLElement>('tr[data-fila]')
  const id = tr?.dataset['fila']
  if (tr === null || tr === undefined || id === undefined) return null
  const caja = tr.getBoundingClientRect()
  return { id, lado: y < caja.top + caja.height / 2 ? 'antes' : 'despues' }
}

const distancia = (a: { x: number; y: number }, e: PointerEvent) =>
  Math.hypot(e.clientX - a.x, e.clientY - a.y)

type Args = {
  // Con una celda en edición o guardándose, no se arrastra.
  apagado: boolean
  alSoltar: (id: string, sobre: SobreLaFila) => void
}

// Arrastrar una fila por su número (`[data-asa]`, D13 y D7): marca dónde cae y, al soltar sobre otra fila, la mueve ahí (y a su banda). Sin dnd-kit: un solo
// `pointerdown` delegado en la grilla y los movimientos en la ventana mientras dura. Esc o `pointercancel` lo cancelan.
export function useArrastreDeFila({ apagado, alSoltar }: Args) {
  const [arrastre, setArrastre] = useState<Arrastre | null>(null)
  const limpiar = useRef<(() => void) | null>(null)
  useEffect(
    () => () => {
      limpiar.current?.()
    },
    [],
  )
  const alApretar = (e: EventoDePuntero<HTMLElement>) => {
    if (apagado || e.button !== 0 || !(e.target instanceof Element)) return
    const leido = e.target.closest('[data-asa]')?.closest<HTMLElement>('tr[data-fila]')?.dataset[
      'fila'
    ]
    if (leido === undefined) return
    // Ya acotado: las funciones de abajo se declaran antes (suben) y no heredan el acotamiento de `leido`.
    const id: string = leido
    const inicio = { x: e.clientX, y: e.clientY }
    const dedo = e.pointerType === 'touch'
    let activo = false
    let ultimo: SobreLaFila | null = null
    const empezar = () => {
      activo = true
      setArrastre({ id, sobre: null })
    }
    const espera = dedo ? window.setTimeout(empezar, ESPERA_DEL_DEDO) : undefined
    const terminar = () => {
      window.clearTimeout(espera)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', terminar)
      window.removeEventListener('keydown', alEscape)
      window.removeEventListener('touchmove', quieto)
      limpiar.current = null
      setArrastre(null)
    }
    function mover(ev: PointerEvent) {
      if (!activo) {
        if (dedo && distancia(inicio, ev) > TOLERANCIA_DEL_DEDO) terminar()
        else if (!dedo && distancia(inicio, ev) >= UMBRAL_DEL_MOUSE) empezar()
        return
      }
      ev.preventDefault()
      ultimo = sobreEn(ev.clientX, ev.clientY)
      setArrastre({ id, sobre: ultimo })
    }
    function soltar() {
      const destino = ultimo
      const hubo = activo
      terminar()
      if (hubo && destino !== null && destino.id !== id) alSoltar(id, destino)
    }
    function alEscape(ev: KeyboardEvent) {
      if (ev.key === 'Escape') terminar()
    }
    // Con el dedo, la planilla se desplaza hasta que empieza el arrastre; después, no.
    function quieto(ev: TouchEvent) {
      if (activo) ev.preventDefault()
    }
    window.addEventListener('pointermove', mover, { passive: false })
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', terminar)
    window.addEventListener('keydown', alEscape)
    window.addEventListener('touchmove', quieto, { passive: false })
    limpiar.current = terminar
  }
  return { arrastre, alApretar }
}
