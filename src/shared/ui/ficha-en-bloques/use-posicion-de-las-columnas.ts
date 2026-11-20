'use client'

import { useLayoutEffect, type RefObject } from 'react'
import { ATRIBUTO_DE_COLUMNA, type ColumnaDeFicha } from './estilos'
import { columnaQueSeDesplaza } from './columnas-de-la-ficha'

type Posiciones = Partial<Record<ColumnaDeFicha, number>>

const COLUMNAS: readonly ColumnaDeFicha[] = ['lateral', 'principal']

// Cuántas fichas se recuerdan (la más vieja se olvida primero) y cuánto se intenta volver a una posición mientras llega el contenido.
const FICHAS_RECORDADAS = 30
const REINTENTAR_MS = 4000

// Dónde quedó cada columna de cada ficha visitada (por su ruta), mientras dure la sesión de la pestaña.
const recordadas = new Map<string, Posiciones>()

function recordar(clave: string, cual: ColumnaDeFicha, arriba: number) {
  const posiciones = recordadas.get(clave) ?? {}
  posiciones[cual] = arriba
  recordadas.delete(clave)
  recordadas.set(clave, posiciones)
  if (recordadas.size > FICHAS_RECORDADAS) {
    const vieja = recordadas.keys().next()
    if (!vieja.done) {
      recordadas.delete(vieja.value)
    }
  }
}

// Al volver a una ficha, cada columna recupera su posición. Guarda al desplazar (una columna oculta no se puede leer) y repone al montar
// y cada vez que la pantalla vuelve a mostrarse. Mientras el contenido llega o se acomoda (un
// bloque en su esqueleto, una foto que se dibuja) insiste durante unos segundos, salvo que otro ya haya movido la columna (`useIrAlLlegar()` al llegar con `?seccion=`) o la persona haya hecho algo.
export function usePosicionDeLasColumnas(raiz: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const ficha = raiz.current
    if (!ficha) {
      return
    }
    const clave = window.location.pathname
    // Lo que falta por reponer (una copia: lo recordado sólo lo cambia quien se desplaza).
    const pendientes: Posiciones = { ...recordadas.get(clave) }
    // Dónde quedó cada columna tras reponerla: lo que cambia sin que la persona haga nada (el contenido que llega o se acomoda) no es suyo.
    const vistas: Posiciones = {}
    const alDesplazar = (evento: Event) => {
      const cual =
        evento.target instanceof HTMLElement
          ? evento.target.getAttribute(ATRIBUTO_DE_COLUMNA)
          : null
      // Mientras una columna espera su posición, lo que lee (el inicio, o lo que alcanza) no es de quien la mira.
      if ((cual === 'lateral' || cual === 'principal') && pendientes[cual] === undefined) {
        const columna = columnaQueSeDesplaza(ficha, cual)
        if (columna) {
          recordar(clave, cual, columna.scrollTop)
        }
      }
    }
    // El `scroll` no sube por el árbol: se escucha en la captura.
    ficha.addEventListener('scroll', alDesplazar, { capture: true, passive: true })
    const reponer = () => {
      for (const cual of COLUMNAS) {
        const quiero = pendientes[cual]
        const columna = columnaQueSeDesplaza(ficha, cual)
        if (quiero === undefined || !columna) {
          continue
        }
        const vista = vistas[cual]
        const hoy = columna.scrollTop
        // Si no está donde la dejé, ni en el tope al que la achicó un contenido más bajo, ni en el inicio, otro la movió: no se le pelea.
        const esLaSuya =
          vista === undefined ||
          hoy === vista ||
          hoy === 0 ||
          (hoy < vista && hoy >= columna.scrollHeight - columna.clientHeight - 1)
        if (!esLaSuya) {
          delete pendientes[cual]
          continue
        }
        columna.scrollTop = quiero
        vistas[cual] = columna.scrollTop
      }
    }
    reponer()
    const delPersona = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    let fin = 0
    const observador = new ResizeObserver(() => {
      reponer()
    })
    // Deja de reponer: pasó el tiempo o la persona hizo algo (lo que quedaba pendiente ya no se repone, y lo que lea desde entonces es suyo).
    function soltar() {
      delete pendientes.lateral
      delete pendientes.principal
      observador.disconnect()
      window.clearTimeout(fin)
      for (const evento of delPersona) {
        window.removeEventListener(evento, soltar)
      }
    }
    if (Object.keys(pendientes).length > 0) {
      for (const cual of COLUMNAS) {
        const columna = columnaQueSeDesplaza(ficha, cual)
        if (columna) {
          // La caja (su alto se acomoda al mostrarse) y lo que lleva (llega o crece).
          observador.observe(columna)
          for (const hijo of columna.children) {
            observador.observe(hijo)
          }
        }
      }
      fin = window.setTimeout(soltar, REINTENTAR_MS)
      for (const evento of delPersona) {
        window.addEventListener(evento, soltar, { passive: true })
      }
    }
    return () => {
      ficha.removeEventListener('scroll', alDesplazar, { capture: true })
      soltar()
    }
  }, [raiz])
}
