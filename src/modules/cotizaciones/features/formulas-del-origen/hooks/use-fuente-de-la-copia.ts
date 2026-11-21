'use client'

import { useState } from 'react'
import { ok } from '@/shared/lib/errores'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerFormulasParaCopiar } from '../../../areas/formulas-del-origen/composicion.client'
import {
  motivoDeLaPieza,
  piezaParaCopiarDeOtro,
  type Pieza,
} from '../../../entities/formulas-del-origen/copiar'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'

export type ComoEmpieza = 'blanco' | 'este' | 'otro'

export const FALTA_LA_COPIA = 'Elige la fórmula que se copia.'
export const FALTA_EL_ORIGEN = 'Elige el origen de la fórmula.'

const SIN_FORMULAS = () => Promise.resolve(ok({ formulas: [], hayMas: false }))

// De este origen se elige la versión (la publicada, si tiene); de otro, la publicada o, sin ella, el borrador.
function piezaDe(copia: FormulaDeLaLista | null, como: ComoEmpieza, elegida: Pieza | null) {
  if (copia === null) return null
  return como === 'este' ? (elegida ?? piezaParaCopiarDeOtro(copia)) : piezaParaCopiarDeOtro(copia)
}

// Qué copia «Nueva fórmula»: cómo empieza, el origen, la fórmula y la versión. Las fórmulas del origen elegido se leen desde el navegador al elegirlo (las de
// este origen, al abrir; con `copiaInicial`, también esa aunque esté archivada).
export function useFuenteDeLaCopia(origenId: string, copiaInicial: string | null) {
  const [como, setComo] = useState<ComoEmpieza>(copiaInicial ? 'este' : 'blanco')
  const [otroOrigenId, setOtroOrigenId] = useState<string | null>(null)
  const [copiaId, setCopiaId] = useState<string | null>(copiaInicial)
  const [piezaElegida, setPiezaElegida] = useState<Pieza | null>(null)

  const origenDeLaCopia = como === 'este' ? origenId : como === 'otro' ? otroOrigenId : null
  const { lectura, reintentar } = useLecturaAlMontar(
    origenDeLaCopia === null
      ? SIN_FORMULAS
      : () => leerFormulasParaCopiar(origenDeLaCopia, como === 'este' ? copiaInicial : null),
    origenDeLaCopia ?? 'ninguno',
  )
  const formulas = lectura.estado === 'leido' ? lectura.dato.formulas : []
  const copia = como === 'blanco' ? null : (formulas.find((f) => f.id === copiaId) ?? null)
  const pieza = piezaDe(copia, como, piezaElegida)

  return {
    como,
    otroOrigenId,
    origenDeLaCopia: copia ? origenDeLaCopia : null,
    lectura,
    reintentarLaLectura: reintentar,
    formulas,
    copia,
    pieza,
    // Por qué no se puede crear con lo elegido, junto a cada campo.
    motivos: (): Record<string, string> => {
      if (como === 'otro' && otroOrigenId === null) return { origen: FALTA_EL_ORIGEN }
      if (como !== 'blanco' && copia === null) return { copia: FALTA_LA_COPIA }
      if (copia === null) return {}
      const motivo = pieza === null ? FALTA_LA_COPIA : motivoDeLaPieza(copia, pieza)
      return motivo ? { pieza: motivo } : {}
    },
    elegirComo: (valor: ComoEmpieza) => {
      setComo(valor)
      setCopiaId(null)
      setPiezaElegida(null)
    },
    elegirOtroOrigen: (id: string | null) => {
      setOtroOrigenId(id)
      setCopiaId(null)
    },
    elegirCopia: (id: string | null) => {
      setCopiaId(id)
      setPiezaElegida(null)
    },
    elegirPieza: setPiezaElegida,
  }
}
