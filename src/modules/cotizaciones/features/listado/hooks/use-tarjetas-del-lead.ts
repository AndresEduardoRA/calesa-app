'use client'

import { useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import {
  leerTarjetasDelLead,
  type TarjetasDelLead,
} from '../../../areas/listado/composicion.client'

type Estado = { leido: TarjetasDelLead | null; cargando: boolean; error: ErrorApp | null }

const SIN_LEER: Estado = { leido: null, cargando: false, error: null }

// Las cotizaciones de la ficha del lead (la fila de tarjetas): una lectura al montarse. Una respuesta que ya no es la del último pedido (otro «Reintentar», el componente ya no
// está, el primer montaje de `StrictMode`) se descarta: `ultimo`, que sólo crece, es el único guardián.
export function useTarjetasDelLead(leadId: string) {
  const [estado, setEstado] = useState<Estado>(SIN_LEER)
  const ultimo = useRef(0)

  useEffect(
    () => () => {
      ultimo.current += 1
    },
    [],
  )

  const leer = () => {
    ultimo.current += 1
    const pedido = ultimo.current
    setEstado((antes) => ({ ...antes, cargando: true, error: null }))
    leerTarjetasDelLead(leadId)
      .catch((): Resultado<TarjetasDelLead> =>
        fallo('inesperado', 'No pudimos cargar las cotizaciones.'),
      )
      .then((resultado) => {
        if (pedido !== ultimo.current) {
          return
        }
        setEstado((antes) =>
          resultado.ok
            ? { leido: resultado.data, cargando: false, error: null }
            : { ...antes, cargando: false, error: resultado.error },
        )
      })
      .catch(() => undefined)
  }

  return {
    ...estado,
    // La primera lectura, una vez: no repite lo leído, lo que va en camino ni lo que falló (eso es «Reintentar»).
    leerLaPrimera: () => {
      if (estado.leido === null && !estado.cargando && estado.error === null) {
        leer()
      }
    },
    reintentar: () => {
      if (!estado.cargando) {
        leer()
      }
    },
  }
}
