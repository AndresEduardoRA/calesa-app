'use client'

import { useRef, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import {
  leerArchivadas,
  type CursorDeArchivadas,
} from '../../../areas/formulas-del-origen/composicion.client'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'

type Estado =
  | { tipo: 'sin-pedir' }
  | { tipo: 'cargando'; formulas: FormulaDeLaLista[] }
  | { tipo: 'lista'; formulas: FormulaDeLaLista[]; siguiente: CursorDeArchivadas | null }
  | {
      tipo: 'error'
      formulas: FormulaDeLaLista[]
      error: ErrorApp
      desde: CursorDeArchivadas | null
    }

// Las archivadas de un origen: se piden al abrir la sección y «Ver más» suma la página siguiente (de a 20, hasta 500). Una respuesta que llega tarde (se
// volvió a pedir) se descarta.
export function useArchivadas(origenId: string) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'sin-pedir' })
  const turnos = useRef(0)
  const formulas = estado.tipo === 'sin-pedir' ? [] : estado.formulas

  async function pedir(desde: CursorDeArchivadas | null, antes: FormulaDeLaLista[]) {
    turnos.current += 1
    const turno = turnos.current
    setEstado({ tipo: 'cargando', formulas: antes })
    const leida = await leerArchivadas(origenId, desde)
    if (turno !== turnos.current) return
    setEstado(
      leida.ok
        ? {
            tipo: 'lista',
            formulas: [...antes, ...leida.data.formulas],
            siguiente: leida.data.siguiente,
          }
        : { tipo: 'error', formulas: antes, error: leida.error, desde },
    )
  }

  const enElTope = formulas.length >= TOPE_DE_LO_CARGADO
  return {
    estado,
    formulas,
    enElTope,
    // Al abrir la sección: la primera página, o de nuevo si se pidió y se cerró (algo pudo archivarse).
    abrir: () => {
      void pedir(null, [])
    },
    verMas:
      estado.tipo === 'lista' && estado.siguiente !== null && !enElTope
        ? () => {
            void pedir(estado.siguiente, estado.formulas)
          }
        : null,
    reintentar:
      estado.tipo === 'error'
        ? () => {
            void pedir(estado.desde, estado.formulas)
          }
        : null,
  }
}
