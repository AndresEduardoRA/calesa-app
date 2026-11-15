'use client'

import { useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import {
  leerPaginaDeLeadsDelVehiculo,
  leerPaginaDeVehiculosDelLead,
} from '../../../composicion.client'
import {
  TAMANO_DE_RELACIONADOS,
  cursorDeLaFila,
  type CursorDeRelacionados,
  type FilaRelacionada,
  type LeadRelacionado,
  type PaginaDeRelacionados,
  type TipoDeRelacion,
  type VehiculoRelacionado,
} from '../../../entities/relacionados'

// De quién es la lista: de un vehículo (sus leads) o de un lead (sus vehículos), y de qué tipo.
export type ListaDeRelacionados =
  | { lado: 'vehiculo'; id: string; tipo: Exclude<TipoDeRelacion, 'vinculado'> }
  | { lado: 'lead'; id: string; tipo: TipoDeRelacion }

type Fila = FilaRelacionada<LeadRelacionado | VehiculoRelacionado>

type Estado = {
  filas: Fila[]
  // Había una página más tras las que se muestran: el cursor es el de la última fila dibujada.
  hayMas: boolean
  cortada: boolean
  // Con `cortada`, hasta dónde llegó el recorrido: «Seguir buscando» sigue desde ahí.
  corte: CursorDeRelacionados | null
  leido: boolean
  cargando: boolean
  error: ErrorApp | null
}

const SIN_LEER: Estado = {
  filas: [],
  hayMas: false,
  cortada: false,
  corte: null,
  leido: false,
  cargando: false,
  error: null,
}

async function leerPagina(
  de: ListaDeRelacionados,
  cursor: CursorDeRelacionados | null,
): Promise<Resultado<PaginaDeRelacionados<LeadRelacionado | VehiculoRelacionado>>> {
  // Cada lector se nombra sólo en su rama, al llamarlo.
  if (de.lado === 'vehiculo') {
    return leerPaginaDeLeadsDelVehiculo({ vehiculoId: de.id, tipo: de.tipo, cursor })
  }
  return leerPaginaDeVehiculosDelLead({ leadId: de.id, tipo: de.tipo, cursor })
}

// Las páginas de «Ver todos» de un grupo de relacionados, de a `TAMANO_DE_RELACIONADOS` por cursor `(fecha, id)` de la última fila visible dibujada y hasta
// `TOPE_DE_LO_CARGADO`. La base trae una fila de más para saber si hay otra página: esa no se dibuja y su existencia es `hayMas`. La posición no va a la URL. Una respuesta de un
// pedido que ya no es el último (otro «Ver más», otra lista, el componente ya no está) se descarta.
export function usePaginasDeRelacionados(de: ListaDeRelacionados) {
  const [estado, setEstado] = useState<Estado>(SIN_LEER)
  const ultimo = useRef(0)

  useEffect(
    () => () => {
      ultimo.current = -1
    },
    [],
  )

  const leer = (cursor: CursorDeRelacionados | null) => {
    ultimo.current += 1
    const pedido = ultimo.current
    setEstado((antes) => ({ ...antes, cargando: true, error: null }))
    leerPagina(de, cursor)
      .catch((): Resultado<PaginaDeRelacionados<Fila['contraparte']>> =>
        fallo('inesperado', 'No se pudieron cargar los relacionados.'),
      )
      .then((resultado) => {
        if (pedido !== ultimo.current) {
          return
        }
        setEstado((antes) => {
          if (!resultado.ok) {
            return { ...antes, cargando: false, error: resultado.error }
          }
          const nuevas = resultado.data.filas
          return {
            filas: [...antes.filas, ...nuevas.slice(0, TAMANO_DE_RELACIONADOS)],
            hayMas: nuevas.length > TAMANO_DE_RELACIONADOS,
            cortada: resultado.data.cortada,
            corte: resultado.data.siguiente,
            leido: true,
            cargando: false,
            error: null,
          }
        })
      })
      .catch(() => undefined)
  }

  const ultimaFila = estado.filas.at(-1)
  const cursor = ultimaFila ? cursorDeLaFila(ultimaFila) : null
  const hayMasParaPedir = estado.hayMas && estado.filas.length < TOPE_DE_LO_CARGADO
  return {
    ...estado,
    // En el tope de lo cargado: hay más, pero no se pide (el aviso lo dice).
    enElTope: estado.hayMas && estado.filas.length >= TOPE_DE_LO_CARGADO,
    hayMasParaPedir,
    // La primera página, una vez: no vuelve a pedir lo leído, lo que va en camino ni lo que falló (eso es «Reintentar»).
    leerLaPrimera: () => {
      if (!estado.leido && !estado.cargando && estado.error === null) {
        leer(null)
      }
    },
    // Tras un recorrido cortado por demasiadas ocultas seguidas: sigue desde donde llegó.
    seguirBuscando: () => {
      if (estado.cortada && !estado.cargando) {
        leer(estado.corte)
      }
    },
    verMas: () => {
      if (hayMasParaPedir && !estado.cargando) {
        leer(cursor)
      }
    },
    reintentar: () => {
      if (!estado.cargando) {
        leer(estado.leido ? cursor : null)
      }
    },
  }
}

export type PaginasDeRelacionados = ReturnType<typeof usePaginasDeRelacionados>
