'use client'

import { useMemo, useState } from 'react'
import type { CatalogoDeTablas } from '../../../entities/compilador'
import { sugerencias, type Sugerencia } from '../../../entities/formula/autocompletar'
import type { HojaDeLaPlanilla } from '../../../entities/formula/hoja-de-la-planilla'
import type { EdicionConReferencias } from './use-edicion-con-referencias'

type Args = {
  edicion: EdicionConReferencias
  hoja: HojaDeLaPlanilla
  tablas: CatalogoDeTablas
  grupos: readonly { readonly id: string; readonly etiqueta: string }[]
}

// Lo que el autocompletar ofrece en el cursor de la C en edición (`sugerencias()`: funciones, conceptos de arriba, bandas, tablas y columnas de BUSCARV), la
// elegida (↑/↓) y aceptarla (Enter o Tab: reemplaza lo que se escribía). Esc la cierra hasta el próximo cambio.
export function useSugerencias({ edicion: con, hoja, tablas, grupos }: Args) {
  const e = con.edicion
  const clave = e === null ? null : `${e.texto}\u0000${String(e.cursor)}`
  const [cerradas, setCerradas] = useState<string | null>(null)
  const [elegida, setElegida] = useState<{ clave: string | null; indice: number }>({
    clave: null,
    indice: 0,
  })
  const lista = useMemo(
    () =>
      e === null || e.col !== 'C' || clave === cerradas
        ? []
        : sugerencias(e.texto, e.cursor, {
            hoja,
            numero: hoja.numeroDe.get(e.id) ?? 0,
            tablas,
            grupos,
          }),
    [e, clave, cerradas, hoja, tablas, grupos],
  )
  const indice = elegida.clave === clave ? Math.min(elegida.indice, lista.length - 1) : 0
  const aceptar = (s: Sugerencia | undefined = lista[indice]): boolean => {
    if (s === undefined || e === null) return false
    const texto = e.texto.slice(0, s.desde) + s.insertar + e.texto.slice(s.hasta)
    con.escribir(texto, s.desde + s.insertar.length)
    return true
  }
  return {
    lista,
    indice,
    mover: (paso: 1 | -1) => {
      if (lista.length === 0) return
      setElegida({ clave, indice: (indice + paso + lista.length) % lista.length })
    },
    aceptar,
    cerrar: () => {
      setCerradas(clave)
    },
  }
}

export type SugerenciasDeLaCelda = ReturnType<typeof useSugerencias>
