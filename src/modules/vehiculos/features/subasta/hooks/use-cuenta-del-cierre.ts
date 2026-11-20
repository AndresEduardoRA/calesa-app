'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  cuentaDelCierre,
  periodoDeLaCuenta,
  type CuentaDelCierre,
} from '../../../entities/cuenta-regresiva-del-cierre'

// El reloj de las cuentas regresivas: UN solo temporizador por página, no uno por tarjeta ni por fila (cien cuentas, un `setInterval`). Corre mientras haya alguna
// montada, cada segundo o, con `prefers-reduced-motion`, cada minuto, y todas se leen con el mismo instante. Vive a nivel de módulo porque la página es una sola.
type Reloj = { ahora: number; sinMovimiento: boolean }

const MARGEN_DE_LECTURA = 1000

let reloj: Reloj = { ahora: Date.now(), sinMovimiento: false }
let temporizador: ReturnType<typeof setInterval> | null = null
const oyentes = new Set<() => void>()

function pideMenosMovimiento(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  if (temporizador === null) {
    const sinMovimiento = pideMenosMovimiento()
    reloj = { ahora: Date.now(), sinMovimiento }
    temporizador = setInterval(() => {
      reloj = { ahora: Date.now(), sinMovimiento }
      oyentes.forEach((alCambiar) => {
        alCambiar()
      })
    }, periodoDeLaCuenta(sinMovimiento))
  }
  return () => {
    oyentes.delete(oyente)
    if (oyentes.size === 0 && temporizador !== null) {
      clearInterval(temporizador)
      temporizador = null
    }
  }
}

// Con el temporizador apagado (la primera pintura, antes de suscribirse) el instante no puede ser el de hace minutos: se renueva, y se queda quieto si fue hace menos de un segundo
// (dos lecturas seguidas del mismo render dan lo mismo).
function leer(): Reloj {
  if (temporizador === null) {
    const ahora = Date.now()
    if (ahora - reloj.ahora >= MARGEN_DE_LECTURA) {
      reloj = { ahora, sinMovimiento: reloj.sinMovimiento }
    }
  }
  return reloj
}

// Lo que dice la cuenta del cierre `cierre` ahora. `ahoraDelServidor` (ISO) es el instante con el que el servidor dibujó: el mismo al hidratar, sin diferencia entre su
// texto y el del navegador; de ahí en adelante manda el reloj de la página.
export function useCuentaDelCierre(
  cierre: string | null,
  ahoraDelServidor: string,
): CuentaDelCierre {
  const delServidor = useMemo<Reloj>(
    () => ({ ahora: Date.parse(ahoraDelServidor), sinMovimiento: false }),
    [ahoraDelServidor],
  )
  const { ahora, sinMovimiento } = useSyncExternalStore(suscribir, leer, () => delServidor)
  return cuentaDelCierre(cierre, ahora, !sinMovimiento)
}
