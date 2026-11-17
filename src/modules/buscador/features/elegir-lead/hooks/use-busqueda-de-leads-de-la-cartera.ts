'use client'

import { useEffect, useMemo, useState } from 'react'
import { interpretarBusqueda } from '@/modules/leads/client'
import { MENSAJE_INESPERADO, fallo, type Resultado } from '@/shared/lib/errores'
import { buscarLeadsDeLaCartera } from '../../../composicion.client'
import { estadoDeError } from '../../../entities/estado-de-la-paleta'
import type { EstadoDeElegirLead } from '../../../entities/estado-de-elegir-lead'
import { ELEGIBLES_DE_LA_CARTERA } from '../../../entities/ranking'
import type { FilaDeLead } from '../../../entities/resultados'
import { pareceTelefono } from '../../../entities/telefono-en-la-busqueda'
import { ESPERA_DE_LA_PALETA_MS } from '../../paleta/hooks/use-busqueda-de-la-paleta'

export type LecturaDeLeadsDeLaCartera = (pedido: {
  texto: string
  signal: AbortSignal
}) => Promise<Resultado<FilaDeLead[]>>

type Guardado = { clave: string; estado: EstadoDeElegirLead }

const REPOSO: EstadoDeElegirLead = { tipo: 'reposo' }
const TELEFONO: EstadoDeElegirLead = { tipo: 'telefono' }
const ESPERANDO: EstadoDeElegirLead = { tipo: 'esperando' }

// La lectura no lanza, pero el paso nunca revienta por una que lo haga.
async function leer(
  lectura: LecturaDeLeadsDeLaCartera,
  texto: string,
  signal: AbortSignal,
): Promise<Resultado<FilaDeLead[]>> {
  try {
    return await lectura({ texto, signal })
  } catch {
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
}

// Busca lo que se escribe: espera (la misma espera de la paleta), pide los leads de la cartera que coinciden y descarta la respuesta de una búsqueda ya
// cancelada. El estado se deriva: lo guardado vale sólo si es de la búsqueda de ahora; si no, se espera. Bajo el mínimo o con un teléfono, no se pide nada.
export function useBusquedaDeLeadsDeLaCartera({
  texto,
  lectura = buscarLeadsDeLaCartera,
}: {
  texto: string
  lectura?: LecturaDeLeadsDeLaCartera
}): { estado: EstadoDeElegirLead; reintentar: () => void } {
  const [intento, setIntento] = useState(0)
  const [guardado, setGuardado] = useState<Guardado | null>(null)
  const interp = useMemo(() => interpretarBusqueda(texto), [texto])
  const porTelefono = pareceTelefono(texto)
  // Lo que se pide, como texto: dos escrituras que se interpretan igual (espacios de más) no repiten la búsqueda.
  const pedido =
    interp !== null && !porTelefono ? `${interp.soloNumero ? '#' : ''}${interp.texto}` : null
  const clave = `${String(intento)}|${pedido ?? ''}`

  useEffect(() => {
    if (pedido === null) {
      return
    }
    const controlador = new AbortController()
    const espera = setTimeout(() => {
      setGuardado({ clave, estado: { tipo: 'buscando' } })
      void leer(lectura, pedido, controlador.signal).then((leido) => {
        if (controlador.signal.aborted) {
          return
        }
        if (!leido.ok) {
          const enLinea = typeof navigator === 'undefined' || navigator.onLine
          setGuardado({ clave, estado: estadoDeError(leido.error, enLinea) })
          return
        }
        setGuardado({
          clave,
          estado: {
            tipo: 'listo',
            filas: leido.data.slice(0, ELEGIBLES_DE_LA_CARTERA),
            hayMas: leido.data.length > ELEGIBLES_DE_LA_CARTERA,
          },
        })
      })
    }, ESPERA_DE_LA_PALETA_MS)
    return () => {
      clearTimeout(espera)
      controlador.abort()
    }
  }, [pedido, clave, lectura])

  const estado =
    porTelefono && interp !== null
      ? TELEFONO
      : pedido === null
        ? REPOSO
        : guardado?.clave === clave
          ? guardado.estado
          : ESPERANDO
  return {
    estado,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
