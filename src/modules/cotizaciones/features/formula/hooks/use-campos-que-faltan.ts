'use client'

import { useMemo } from 'react'
import { ok } from '@/shared/lib/errores'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerClavesDeLosCampos } from '../../../areas/formula/composicion.client'
import { camposQueFaltan, nombraCamposPropios } from '../../../entities/campos-que-faltan'
import type { Nodo } from '../../../entities/nodos'

const NINGUNO: ReadonlyMap<string, string> = new Map()

// Las filas de la planilla cuyo dato del vehículo no existe en este origen (la copia de una fórmula de otro): id del nodo → clave del campo. Quedan marcadas
// siempre, no sólo con los avisos de la copia. Lee las claves de los campos del origen una vez, y sólo si la fórmula nombra un dato que no es común; si la lectura
// falla, no marca nada (la base igual no deja publicar ni activar así).
export function useCamposQueFaltan(
  origenId: string,
  nodos: readonly Nodo[],
): ReadonlyMap<string, string> {
  const definicion = useMemo(() => ({ nodos }), [nodos])
  const hayPropios = nombraCamposPropios(definicion)
  const { lectura } = useLecturaAlMontar(
    () => (hayPropios ? leerClavesDeLosCampos(origenId) : Promise.resolve(ok<string[]>([]))),
    `${origenId}:${String(hayPropios)}`,
  )
  const claves = lectura.estado === 'leido' ? lectura.dato : null
  return useMemo(() => {
    if (!hayPropios || claves === null) return NINGUNO
    const faltan = camposQueFaltan(definicion, new Set(claves))
    return new Map(faltan.map(({ nodo, campo }) => [nodo, campo]))
  }, [hayPropios, claves, definicion])
}
