'use client'

import { useEffect, useState } from 'react'
import { leerMasSeguimientos, leerTiposDeSeguimiento } from '../../../composicion.client'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { PaginaDeSeguimientos } from '../../../entities/seguimiento'

export type DatosDeTodos = {
  pagina: PaginaDeSeguimientos
  tipos: TipoDeSeguimiento[]
}

type Lectura =
  { leadId: string; estado: 'listo'; datos: DatosDeTodos } | { leadId: string; estado: 'error' }

// Lo que lee «Ver todos los seguimientos» al abrirse, desde el navegador: la primera página (que dice si se puede anotar) y los tipos
// activos (una lista fija de configuración, que no crece con el lead). La ficha no lo paga hasta entonces.
async function leer(leadId: string): Promise<Lectura> {
  try {
    const [pagina, tipos] = await Promise.all([
      leerMasSeguimientos({ leadId, antes: null }),
      leerTiposDeSeguimiento(),
    ])
    if (!pagina.ok || !tipos.ok) {
      return { leadId, estado: 'error' }
    }
    return { leadId, estado: 'listo', datos: { pagina: pagina.data, tipos: tipos.data } }
  } catch {
    return { leadId, estado: 'error' }
  }
}

export function useLecturaDeTodos(leadId: string) {
  const [lectura, setLectura] = useState<Lectura | null>(null)
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vigente = true
    void leer(leadId).then((nueva) => {
      if (vigente) {
        setLectura(nueva)
      }
    })
    return () => {
      vigente = false
    }
  }, [leadId, intento])

  return {
    // Una lectura de otro lead no vale: se espera la nueva.
    lectura: lectura?.leadId === leadId ? lectura : null,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
