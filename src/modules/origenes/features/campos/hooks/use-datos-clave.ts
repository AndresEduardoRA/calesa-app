'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import type { DatoClave } from '../../../entities/datos-clave'
import {
  conDatoClave,
  esDatoClave,
  moverDatoClave,
  sinDatoClave,
} from '../../../entities/datos-clave-edicion'
import { guardarDatosClave } from '../actions/guardar-datos-clave'

type Props = { origenId: string; datosClave: readonly DatoClave[]; versionDelOrigen: string }

function errorSinRed(): ErrorApp {
  const sinConexion = typeof navigator !== 'undefined' && !navigator.onLine
  return {
    codigo: 'inesperado',
    mensaje: sinConexion ? 'No hay conexión.' : 'No pudimos llegar al servidor.',
  }
}

// Los datos clave de un origen en «Campos»: se guardan al instante, de forma optimista y de a un cambio. Cada cambio manda la lista entera
// con la versión del origen y se queda con la que devuelve (marcas seguidas no chocan entre sí). Si falla, la lista vuelve atrás: con
// conflicto, «Recargar»; sin red, «Reintentar», que repite el mismo cambio. Si llega otra versión por props y no hay nada en vuelo (otra
// persona, o desactivar un campo que era dato clave), se arranca de las props. Sin aviso de éxito: la estrella ya lo dice.
export function useDatosClave({ origenId, datosClave, versionDelOrigen }: Props) {
  const guardando = useAction(guardarDatosClave)
  const [lista, setLista] = useState<readonly DatoClave[]>(datosClave)
  const [version, setVersion] = useState(versionDelOrigen)
  const [deLasProps, setDeLasProps] = useState(versionDelOrigen)
  const [enCurso, setEnCurso] = useState(false)

  if (versionDelOrigen !== deLasProps && !enCurso) {
    setDeLasProps(versionDelOrigen)
    setVersion(versionDelOrigen)
    setLista(datosClave)
  }

  async function aplicar(nueva: DatoClave[], anterior: readonly DatoClave[], esperada: string) {
    setLista(nueva)
    setEnCurso(true)
    let respuesta: Awaited<ReturnType<typeof guardando.executeAsync>> | undefined
    try {
      respuesta = await guardando.executeAsync({
        origenId,
        datos: nueva,
        actualizadoEnEsperado: esperada,
      })
    } catch {
      respuesta = undefined
    }
    setEnCurso(false)
    if (respuesta === undefined) {
      setLista(anterior)
      avisarError(errorSinRed(), {
        alReintentar: () => void aplicar(nueva, anterior, esperada),
      })
      return
    }
    const resultado = resultadoDeAccion(respuesta)
    if (resultado.ok) {
      setVersion(resultado.data.actualizadoEn)
      return
    }
    setLista(anterior)
    avisarError(resultado.error)
  }

  function cambiar(calcular: (actual: readonly DatoClave[]) => DatoClave[]) {
    if (enCurso) {
      return
    }
    void aplicar(calcular(lista), lista, version)
  }

  return {
    lista,
    enCurso,
    // La estrella: marca al final o quita si ya estaba.
    alternar: (dato: DatoClave) => {
      cambiar((actual) =>
        esDatoClave(actual, dato) ? sinDatoClave(actual, dato) : conDatoClave(actual, dato),
      )
    },
    quitar: (dato: DatoClave) => {
      cambiar((actual) => sinDatoClave(actual, dato))
    },
    mover: (indice: number, sentido: 'subir' | 'bajar') => {
      cambiar((actual) => moverDatoClave(actual, indice, sentido))
    },
  }
}

export type DatosClaveEnEdicion = ReturnType<typeof useDatosClave>
