'use client'

import { useState } from 'react'
import type { Completado } from '../../../entities/plantilla/edicion/condiciones'

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// El borrador de una regla del panel (la lista de respaldo, las condiciones de una celda o de una fila): nace de lo que la cuadrícula tiene y sólo vuelve a ella entero
// (`completar`). Lo que cambia afuera (deshacer) se trae como en el texto de la celda: si el borrador está entero y no es lo que llegó; si está a medio armar, queda (es
// lo que se está escribiendo); si es lo mismo que llegó, también (el número sigue como se tipeó). `cambiar` pone el borrador y manda lo entero que cambió.
export function useBorradorDeLaRegla<B, V>({
  valor,
  derivar,
  completar,
  alCompletar,
}: {
  valor: V
  derivar: (v: V) => B
  completar: (b: B) => Completado<V>
  alCompletar: (v: V, clave?: string) => void
}) {
  const [borrador, setBorrador] = useState(() => derivar(valor))
  const [previo, setPrevio] = useState(valor)
  if (valor !== previo) {
    setPrevio(valor)
    const actual = completar(borrador)
    if (actual.ok && !igual(actual.valor, valor)) setBorrador(derivar(valor))
  }
  const completado = completar(borrador)
  const cambiar = (nuevo: B, clave?: string) => {
    setBorrador(nuevo)
    const c = completar(nuevo)
    if (c.ok && !igual(c.valor, valor)) alCompletar(c.valor, clave)
  }
  const motivos = completado.ok ? new Map<string, string>() : completado.motivos
  return { borrador, cambiar, motivos, completo: completado.ok }
}
