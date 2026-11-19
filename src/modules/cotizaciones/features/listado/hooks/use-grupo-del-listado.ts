'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { leerCursor, TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { leerGrupoDelListado } from '../../../areas/listado/composicion.client'
import {
  grupoQueCambio,
  type LineaDelGrupo,
  type PedidoDelGrupo,
} from '../../../entities/listado/grupos-del-listado'

type Estado = {
  filas: LineaDelGrupo[]
  siguiente: string | null
  leido: boolean
  cargando: boolean
  error: ErrorApp | null
}

const SIN_LEER: Estado = { filas: [], siguiente: null, leido: false, cargando: false, error: null }
const NO_PUDIMOS = 'No pudimos cargar las cotizaciones de este vehículo.'

type Opciones = {
  pedido: Omit<PedidoDelGrupo, 'cursor'>
  // La cotización por la que se ordenó el grupo: si la primera página no empieza por ella, la cabeza ya no vale y se relee la página de grupos. Nulo con una
  // búsqueda (sus grupos son de la página que llegó: la primera de las del vehículo puede estar en otra página).
  ordenId: string | null
}

// Las páginas del despliegue de un grupo, de a `TAMANO_DE_ESTE_VEHICULO` por cursor y hasta `TOPE_DE_ESTE_VEHICULO` (la forma de `useDeEsteVehiculo`): una
// respuesta que ya no es la del último pedido (otro «Ver más», el despliegue cerrado, el primer montaje de `StrictMode`) se descarta, y `ultimo` (que sólo crece) es
// el único guardián. Se lee al montarse (al desplegar) y queda en su estado mientras la página no cambie.
export function useGrupoDelListado({ pedido, ordenId }: Opciones) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>(SIN_LEER)
  const ultimo = useRef(0)
  const ultimoDesde = useRef<string | null>(null)

  useEffect(
    () => () => {
      ultimo.current += 1
    },
    [],
  )

  const leer = (desde: string | null) => {
    ultimo.current += 1
    const numero = ultimo.current
    ultimoDesde.current = desde
    setEstado((antes) => ({ ...antes, cargando: true, error: null }))
    leerGrupoDelListado({ ...pedido, cursor: leerCursor(desde) })
      .catch((): Resultado<{ filas: LineaDelGrupo[]; siguiente: string | null }> =>
        fallo('inesperado', NO_PUDIMOS),
      )
      .then((resultado) => {
        if (numero !== ultimo.current) {
          return
        }
        if (
          resultado.ok &&
          desde === null &&
          ordenId !== null &&
          grupoQueCambio({ ordenId }, resultado.data.filas)
        ) {
          // La cabeza ya no vale (la papelera, invalidar o una más nueva mientras se miraba): la página de grupos otra vez.
          router.refresh()
        }
        setEstado((antes) => {
          if (!resultado.ok) {
            return { ...antes, cargando: false, error: resultado.error }
          }
          const { filas, siguiente } = resultado.data
          return {
            filas: desde === null ? filas : [...antes.filas, ...filas],
            siguiente,
            leido: true,
            cargando: false,
            error: null,
          }
        })
      })
      .catch(() => undefined)
  }

  const enElTope = estado.siguiente !== null && estado.filas.length >= TOPE_DE_ESTE_VEHICULO
  const hayMasParaPedir = estado.siguiente !== null && !enElTope
  return {
    ...estado,
    enElTope,
    hayMasParaPedir,
    leerLaPrimera: () => {
      if (!estado.leido && !estado.cargando && estado.error === null) {
        leer(null)
      }
    },
    verMas: () => {
      if (hayMasParaPedir && !estado.cargando) {
        leer(estado.siguiente)
      }
    },
    reintentar: () => {
      if (!estado.cargando) {
        leer(estado.leido ? ultimoDesde.current : null)
      }
    },
  }
}

export type GrupoLeido = ReturnType<typeof useGrupoDelListado>
