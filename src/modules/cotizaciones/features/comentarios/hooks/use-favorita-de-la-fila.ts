'use client'

import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import { ponerFavorita } from '../actions/poner-favorita'

const NO_SE_MARCO = 'No se pudo cambiar la favorita.'

// «Favorita» desde el «⋯» de una fila: una marca privada de quien mira, igual que en la guardada (`ponerFavorita`, sin versión). Cambia al tocar, antes de que responda la base; la
// respuesta manda y, si falla, vuelve a como estaba y lo avisa. `leidas` es lo que trajo el servidor: cuando llega una lectura nueva de la página reemplaza lo de aquí. El último toque de
// cada cotización manda: una respuesta vieja no pisa lo que se tocó después.
export function useFavoritaDeLaFila(leidas: ReadonlyMap<string, boolean>) {
  const [base, setBase] = useState(leidas)
  const [cambios, setCambios] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [enCurso, setEnCurso] = useState<ReadonlySet<string>>(new Set())
  const ultimo = useRef(new Map<string, number>())
  if (base !== leidas) {
    setBase(leidas)
    setCambios(new Map())
  }

  function poner(id: string, valor: boolean) {
    const antes = cambios.get(id) ?? leidas.get(id) ?? false
    const toque = (ultimo.current.get(id) ?? 0) + 1
    ultimo.current.set(id, toque)
    setCambios((mapa) => new Map(mapa).set(id, valor))
    setEnCurso((ids) => new Set(ids).add(id))
    void enviarAccion(ponerFavorita({ cotizacionId: id, valor }), NO_SE_MARCO).then((resultado) => {
      if (ultimo.current.get(id) !== toque) {
        return
      }
      setEnCurso((ids) => {
        const siguiente = new Set(ids)
        siguiente.delete(id)
        return siguiente
      })
      if (resultado.ok) {
        setCambios((mapa) => new Map(mapa).set(id, resultado.data.valor))
      } else {
        setCambios((mapa) => new Map(mapa).set(id, antes))
        avisarError(resultado.error)
      }
    })
  }

  return {
    poner,
    esFavorita: (id: string) => cambios.get(id) ?? leidas.get(id) ?? false,
    enCurso: (id: string) => enCurso.has(id),
  }
}
