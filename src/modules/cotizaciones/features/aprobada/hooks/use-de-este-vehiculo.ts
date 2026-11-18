'use client'

import { useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { leerCursor, TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { leerDeEsteVehiculo } from '../../../areas/aprobada/composicion.client'
import {
  filasALaVista,
  type FilaDeEsteVehiculo,
  type PaginaLeidaDeEsteVehiculo,
} from '../../../entities/aprobada/de-este-vehiculo'

// Lo leído: sin leer, la primera en camino, leído (con lo que sumó «Ver más») o fallido. `error` es el del último pedido: sin leer es la primera página;
// leído, la de «Ver más» o la relectura (lo leído se queda).
type Estado = {
  fijada: FilaDeEsteVehiculo | null
  filas: FilaDeEsteVehiculo[]
  siguiente: string | null
  leido: boolean
  cargando: boolean
  error: ErrorApp | null
}

const SIN_LEER: Estado = {
  fijada: null,
  filas: [],
  siguiente: null,
  leido: false,
  cargando: false,
  error: null,
}

const NO_PUDIMOS = 'No pudimos cargar las cotizaciones de este vehículo.'

// Las páginas de «De este vehículo», de a `TAMANO_DE_ESTE_VEHICULO` por cursor y hasta `TOPE_DE_ESTE_VEHICULO`, con la aprobada primero. La forma es la de
// `usePaginasDelHistorial`: una respuesta que ya no es la del último pedido (otro «Ver más», una relectura, el componente ya no está, el primer montaje de
// `StrictMode`) se descarta, y ese `ultimo` es el único guardián.
export function useDeEsteVehiculo(vehiculoId: string) {
  const [estado, setEstado] = useState<Estado>(SIN_LEER)
  const ultimo = useRef(0)

  useEffect(
    () => () => {
      ultimo.current = -1
    },
    [],
  )

  // `desde` nulo es la primera página: reemplaza lo leído (la relectura tras aprobar deja ver lo de antes hasta que llega).
  const leer = (desde: string | null) => {
    ultimo.current += 1
    const pedido = ultimo.current
    setEstado((antes) => ({ ...antes, cargando: true, error: null }))
    leerDeEsteVehiculo({ vehiculoId, cursor: leerCursor(desde) })
      .catch((): Resultado<PaginaLeidaDeEsteVehiculo> => fallo('inesperado', NO_PUDIMOS))
      .then((resultado) => {
        if (pedido !== ultimo.current) {
          return
        }
        setEstado((antes) => {
          if (!resultado.ok) {
            return { ...antes, cargando: false, error: resultado.error }
          }
          const { fijada, filas, siguiente } = resultado.data
          return desde === null
            ? { fijada, filas, siguiente, leido: true, cargando: false, error: null }
            : {
                fijada: antes.fijada,
                filas: [...antes.filas, ...filas],
                siguiente,
                leido: true,
                cargando: false,
                error: null,
              }
        })
      })
      .catch(() => undefined)
  }

  const aLaVista = filasALaVista(estado)
  const enElTope = estado.siguiente !== null && aLaVista.length >= TOPE_DE_ESTE_VEHICULO
  const hayMasParaPedir = estado.siguiente !== null && !enElTope
  return {
    ...estado,
    aLaVista,
    // En el tope de lo que se dibuja: hay más, pero no se pide (el aviso manda al listado).
    enElTope,
    hayMasParaPedir,
    // La primera página, una vez: no vuelve a pedir lo leído, lo que va en camino ni lo que falló (eso es «Reintentar»).
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
        leer(estado.leido ? estado.siguiente : null)
      }
    },
    // Tras aprobar o deshacer (aquí o en otra isla): la primera página otra vez, para que la nueva aprobada suba.
    releer: () => {
      leer(null)
    },
  }
}

export type DeEsteVehiculoLeido = ReturnType<typeof useDeEsteVehiculo>
