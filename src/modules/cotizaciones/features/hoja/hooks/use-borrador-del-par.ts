'use client'

import { useMemo } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import {
  entradasComoBorrador,
  entradasDelBorrador,
  esDescarte,
  verTotalBsDelBorrador,
  type BorradorDeHoja,
} from '../../../entities/borrador-de-hoja'
import type { Entradas, IndiceDeHoja } from '../../../entities/entradas'

type Columna = {
  entradas: Entradas
  iniciales: Entradas
  indice: IndiceDeHoja
  reponer: (e: Entradas, verTotalBs: boolean) => void
}
type BorradorDelPar = { a: BorradorDeHoja; b: BorradorDeHoja }

// El borrador de una hoja en par (4-29; glosario: «Variante en par»): lo tipeado de las dos columnas en UNA clave de la pestaña, así vuelve con un solo aviso y
// «Descartar» vacía las dos.
export function useBorradorDelPar({
  clave,
  a,
  b,
  verTotalBs,
  verTotalBsInicial,
  ofrece,
  alDescartar,
}: {
  clave: string | null
  a: Columna
  b: Columna
  verTotalBs: boolean
  verTotalBsInicial: boolean
  ofrece: boolean
  alDescartar: () => void
}): void {
  const valores = useMemo<BorradorDelPar>(
    () => ({
      a: entradasComoBorrador(a.entradas, verTotalBs),
      b: entradasComoBorrador(b.entradas, verTotalBs),
    }),
    [a.entradas, b.entradas, verTotalBs],
  )
  const vacio = useMemo<BorradorDelPar>(
    () => ({
      a: entradasComoBorrador(a.iniciales, verTotalBsInicial),
      b: entradasComoBorrador(b.iniciales, verTotalBsInicial),
    }),
    [a.iniciales, b.iniciales, verTotalBsInicial],
  )
  useBorradorDeEstado<BorradorDelPar>({
    clave: clave ?? '',
    activo: clave !== null,
    valores,
    guardado: vacio,
    alReponer: (cambios) => {
      // Llega sólo lo que difiere de lo vacío: una columna sin cambios no viene.
      const parcial: Partial<BorradorDelPar> = cambios
      const leidoA = { ...vacio.a, ...parcial.a }
      const leidoB = { ...vacio.b, ...parcial.b }
      if (esDescarte(leidoA, vacio.a) && esDescarte(leidoB, vacio.b)) {
        alDescartar()
        return
      }
      a.reponer(entradasDelBorrador(leidoA, a.indice), verTotalBsDelBorrador(leidoA, ofrece))
      b.reponer(entradasDelBorrador(leidoB, b.indice), verTotalBsDelBorrador(leidoB, ofrece))
    },
  })
}
