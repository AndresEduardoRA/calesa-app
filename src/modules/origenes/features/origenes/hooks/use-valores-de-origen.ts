'use client'

import { useState } from 'react'
import type { PlataformaApibara } from '@/shared/lib/apibara'
import { generoSugerido } from '../../../entities/nombre'
import type { Genero } from '../../../entities/origen'

export type ValoresDeOrigen = {
  nombre: string
  sustantivo: string
  genero: Genero
  color: string
  plataformas: PlataformaApibara[]
}

export const COLOR_INICIAL = '#465fff'

const comparable = (valores: ValoresDeOrigen) =>
  JSON.stringify([
    valores.nombre.trim(),
    valores.sustantivo.trim().toLowerCase(),
    valores.genero,
    valores.color.toLowerCase(),
    [...valores.plataformas].sort(),
  ])

// Si lo que muestra el formulario difiere de lo guardado (la barra de cambios sin guardar). Compara como guarda la base: sin los espacios
// de los bordes, el sustantivo y el color en minúsculas y las plataformas sin importar el orden.
export function hayCambiosEnElOrigen(valores: ValoresDeOrigen, guardado: ValoresDeOrigen): boolean {
  return comparable(valores) !== comparable(guardado)
}

// El formulario de un origen. Mientras la persona no toque el género, acompaña al sustantivo
// («unidad» → femenino); en cuanto lo elige, es suyo. `reiniciar()` vuelve a lo del principio («Descartar»).
export function useValoresDeOrigen(inicial: ValoresDeOrigen, generoYaElegido: boolean) {
  const [delPrincipio] = useState(() => ({ valores: inicial, generoElegido: generoYaElegido }))
  const [valores, setValores] = useState(inicial)
  const [generoElegido, setGeneroElegido] = useState(generoYaElegido)

  function cambiar(parcial: Partial<ValoresDeOrigen>) {
    if (parcial.genero !== undefined) {
      setGeneroElegido(true)
    }
    setValores((actuales) => {
      const siguiente = { ...actuales, ...parcial }
      if (parcial.sustantivo !== undefined && parcial.genero === undefined && !generoElegido) {
        siguiente.genero = generoSugerido(parcial.sustantivo)
      }
      return siguiente
    })
  }

  function reiniciar() {
    setValores(delPrincipio.valores)
    setGeneroElegido(delPrincipio.generoElegido)
  }

  return { valores, cambiar, reiniciar }
}
