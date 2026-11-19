'use client'

import { useMemo, useState } from 'react'
import type { PlantillaEnCuadricula } from '../../../entities/cuadricula-de-la-tarjeta'
import type { Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import { primerTextoLargo } from '../../../entities/tarjeta/retoques/borrador-de-retoques'
import {
  filasDelModo,
  lugarDelCampo,
  motivoDeLaCeldaSinTexto,
  type FilaDelModo,
} from '../../../entities/tarjeta/retoques/modo-de-la-tarjeta'
import { useEscalaDeLaTarjeta } from './use-escala-de-la-tarjeta'
import type { ModoRetocar } from './use-modo-retocar'

// El tamaño de la letra raíz (el texto al 200 % lo dobla): decide si el campo cabe encima de la celda. Se lee una vez por montaje (sólo en el navegador: el
// modo llega con `diferido()`).
function useFuenteRaiz(): number {
  const [fuente] = useState(
    () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
  )
  return fuente
}

// Lo que la tarjeta del modo «Retocar» deriva de la geometría del borrador: la escala, las filas con su rótulo, el tipo de cada celda (de la plantilla: un dato
// también se dibuja como texto), la celda o la fila elegida, dónde va el campo y el error de la base junto a lo elegido.
export function useTarjetaRetocable(
  modo: ModoRetocar,
  geometria: Geometria,
  plantilla: PlantillaEnCuadricula,
) {
  const { ref, escala } = useEscalaDeLaTarjeta(geometria.ancho)
  const fuenteRaiz = useFuenteRaiz()
  const ocultas = useMemo(() => new Set(modo.borrador.filas_ocultas), [modo.borrador.filas_ocultas])
  const filas = useMemo(() => filasDelModo(geometria, ocultas), [geometria, ocultas])
  const porId = useMemo(() => new Map<string, FilaDelModo>(filas.map((f) => [f.id, f])), [filas])
  const tipos = useMemo(
    () => new Map(plantilla.celdas.map((c) => [c.id, c.contenido.tipo])),
    [plantilla],
  )
  const { elegida, fallo } = modo
  const celdaElegida =
    elegida?.tipo === 'celda' ? geometria.celdas.find((c) => c.id === elegida.id) : undefined
  const filaElegida = elegida?.tipo === 'fila' ? porId.get(elegida.id) : undefined
  const errorDe = (tipo: 'celda' | 'fila', id: string) =>
    fallo?.tipo === 'regla' && fallo.donde?.tipo === tipo && fallo.donde.id === id
      ? fallo.mensaje
      : null
  return {
    ref,
    escala,
    filas,
    porId,
    tipos,
    largo: primerTextoLargo(modo.borrador),
    celdaElegida,
    filaElegida,
    lugar:
      celdaElegida === undefined
        ? null
        : lugarDelCampo({ escala, anchoDeLaCelda: celdaElegida.ancho, fuenteRaiz }),
    motivoDeLaFila:
      elegida?.tipo === 'fila' && elegida.celda !== undefined
        ? motivoDeLaCeldaSinTexto(tipos.get(elegida.celda))
        : null,
    errorDe,
  }
}
