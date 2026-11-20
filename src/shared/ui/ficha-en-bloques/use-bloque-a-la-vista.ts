'use client'

import { useEffect, useState, type RefObject } from 'react'
import { bloqueALaVista } from '@/shared/lib/bloque-a-la-vista'
import { columnaQueSeDesplaza } from './columnas-de-la-ficha'
import { ATRIBUTO_DE_BLOQUE, ATRIBUTO_DE_LA_FICHA, EVENTO_DE_SALTO } from './estilos'

// El margen bajo el índice que todavía cuenta como «llegué»: un bloque al que se saltó queda 1 rem por debajo (`scroll-mt`).
const MARGEN_DE_LA_LINEA_PX = 24

// Las teclas con las que la persona se desplaza por su cuenta: después de una, manda otra vez la posición y no el último salto.
const TECLAS_DE_DESPLAZAR = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
])

function medir(raiz: Element, indice: HTMLElement): string | null {
  const bloques = raiz.querySelectorAll<HTMLElement>(`[${ATRIBUTO_DE_BLOQUE}="principal"]`)
  const posiciones = Array.from(bloques, (bloque) => ({
    ancla: bloque.id,
    arriba: bloque.getBoundingClientRect().top,
  }))
  const linea = indice.getBoundingClientRect().bottom + MARGEN_DE_LA_LINEA_PX
  return bloqueALaVista(posiciones, linea, alFinal(raiz))
}

// La página (o, en dos columnas, la columna principal) ya no baja más.
function alFinal(raiz: Element): boolean {
  const columna = columnaQueSeDesplaza(raiz, 'principal')
  if (columna) {
    return columna.scrollTop + columna.clientHeight >= columna.scrollHeight - 2
  }
  const doc = document.documentElement
  return window.scrollY + window.innerHeight >= doc.scrollHeight - 2
}

// Qué bloque de la columna principal está a la vista (`bloqueALaVista()`), medido al desplazar (la página o la columna) y al cambiar el tamaño. Tras un salto a
// propósito (`irAlBloque()`) marca ése hasta que la persona se desplace por su cuenta: el último bloque, si es corto, nunca llega a la
// línea, y la página al final marcaría otro.
export function useBloqueALaVista(indice: RefObject<HTMLElement | null>): string | null {
  const [actual, setActual] = useState<string | null>(null)
  useEffect(() => {
    const nav = indice.current
    const raiz = nav?.closest(`[${ATRIBUTO_DE_LA_FICHA}]`)
    if (!nav || !raiz) {
      return
    }
    let saltado: string | null = null
    let marco = 0
    const leer = () => {
      marco = 0
      setActual(saltado ?? medir(raiz, nav))
    }
    const pedir = () => {
      if (marco === 0) {
        marco = window.requestAnimationFrame(leer)
      }
    }
    const alSaltar = (evento: Event) => {
      const ancla = (evento as CustomEvent<unknown>).detail
      const bloque = typeof ancla === 'string' ? document.getElementById(ancla) : null
      saltado = bloque?.getAttribute(ATRIBUTO_DE_BLOQUE) === 'principal' ? bloque.id : null
      pedir()
    }
    const soltar = () => {
      if (saltado !== null) {
        saltado = null
        pedir()
      }
    }
    const alTeclear = (evento: KeyboardEvent) => {
      if (TECLAS_DE_DESPLAZAR.has(evento.key)) {
        soltar()
      }
    }
    leer()
    const opciones = { passive: true } as const
    window.addEventListener('scroll', pedir, opciones)
    // El `scroll` de una columna no sube por el árbol: en dos columnas, la principal se desplaza por dentro.
    raiz.addEventListener('scroll', pedir, { capture: true, passive: true })
    window.addEventListener('resize', pedir, opciones)
    window.addEventListener('wheel', soltar, opciones)
    window.addEventListener('touchmove', soltar, opciones)
    window.addEventListener('keydown', alTeclear)
    raiz.addEventListener(EVENTO_DE_SALTO, alSaltar)
    const observador = new ResizeObserver(pedir)
    observador.observe(raiz)
    return () => {
      window.cancelAnimationFrame(marco)
      window.removeEventListener('scroll', pedir)
      raiz.removeEventListener('scroll', pedir, { capture: true })
      window.removeEventListener('resize', pedir)
      window.removeEventListener('wheel', soltar)
      window.removeEventListener('touchmove', soltar)
      window.removeEventListener('keydown', alTeclear)
      raiz.removeEventListener(EVENTO_DE_SALTO, alSaltar)
      observador.disconnect()
    }
  }, [indice])
  return actual
}
