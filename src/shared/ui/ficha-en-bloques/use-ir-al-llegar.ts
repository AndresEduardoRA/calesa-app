'use client'

import { useEffect } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { ATRIBUTO_DE_LA_FICHA } from './estilos'
import { irAlBloque, tituloDe } from './ir-al-bloque'

// Cuánto se vigila la llegada de lo de arriba (bloques que llegan tarde y crecen) después de llegar al bloque.
const VIGILAR_MS = 4000

// Al llegar a la ficha con un bloque pedido (`?seccion=` de un enlace viejo, un aviso, la bandeja), o cuando el servidor cambia el
// pedido, lleva la página a ese bloque (sin animación) y le da el foco a su título. Con un modal de la URL abierto (`?panel=`) sólo
// desplaza: el foco es del modal. Si un bloque de arriba crece mientras llega lo suyo, vuelve a llevar **una** vez, salvo que la
// persona ya se haya movido (rueda, toque o tecla): nunca le pelea el desplazamiento. Si el bloque todavía muestra su esqueleto (sin
// título), el foco va al título cuando llega, salvo que la persona ya haya hecho algo.
export function useIrAlLlegar(ancla: string | null) {
  useEffect(() => {
    if (ancla === null) {
      return
    }
    const conModal = new URLSearchParams(window.location.search).has(CLAVE_DE_PANEL)
    if (!irAlBloque(ancla, { enfocar: !conModal, suave: false })) {
      return
    }
    const bloque = document.getElementById(ancla)
    const raiz = bloque?.closest(`[${ATRIBUTO_DE_LA_FICHA}]`)
    if (!bloque || !raiz) {
      return
    }
    let tocado = false
    let reLlevado = false
    const marcar = () => {
      tocado = true
    }
    const esperado = bloque.getBoundingClientRect().top
    let sinTitulo = !conModal && bloque.querySelector('h2') === null
    const observador = new ResizeObserver(() => {
      if (tocado) {
        return
      }
      const titulo = sinTitulo ? tituloDe(bloque) : null
      if (titulo && (document.activeElement === null || document.activeElement === document.body)) {
        sinTitulo = false
        titulo.focus({ preventScroll: true })
      }
      if (reLlevado) {
        return
      }
      if (Math.abs(bloque.getBoundingClientRect().top - esperado) > 4) {
        reLlevado = true
        bloque.scrollIntoView({ block: 'start' })
      }
    })
    observador.observe(raiz)
    observador.observe(bloque)
    const opciones = { passive: true } as const
    window.addEventListener('wheel', marcar, opciones)
    window.addEventListener('touchstart', marcar, opciones)
    window.addEventListener('keydown', marcar)
    const fin = window.setTimeout(() => {
      observador.disconnect()
    }, VIGILAR_MS)
    return () => {
      window.clearTimeout(fin)
      observador.disconnect()
      window.removeEventListener('wheel', marcar)
      window.removeEventListener('touchstart', marcar)
      window.removeEventListener('keydown', marcar)
    }
  }, [ancla])
}
