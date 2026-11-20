'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { CursorDeArchivadas } from '../../../areas/formulas-del-origen/composicion.client'
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
// volvió a pedir) se descarta. `lecturaDelServidor` es la lectura de la lista: si cambia (la pantalla se volvió a leer tras renombrar, archivar o activar) y
// las archivadas ya se pidieron, se vuelve a pedir su primera página para no dibujar lo de antes.
export function useArchivadas(origenId: string, lecturaDelServidor: unknown) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'sin-pedir' })
  const turnos = useRef(0)
  const formulas = estado.tipo === 'sin-pedir' ? [] : estado.formulas

  // Lee una página y la suma a `antes`; el estado se escribe recién al llegar (una respuesta de un pedido viejo se descarta).
  async function leer(desde: CursorDeArchivadas | null, antes: FormulaDeLaLista[]) {
    turnos.current += 1
    const turno = turnos.current
    // La lectura (y con ella el cliente de Supabase del navegador, ≈ 68 KB gz) se pide al abrir la sección: la lista no la paga en frío.
    const { leerArchivadas } = await import('../../../areas/formulas-del-origen/composicion.client')
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

  function pedir(desde: CursorDeArchivadas | null, antes: FormulaDeLaLista[]) {
    setEstado({ tipo: 'cargando', formulas: antes })
    void leer(desde, antes)
  }

  // Lo de antes queda a la vista hasta que llega la primera página nueva.
  const releer = useEffectEvent(() => {
    if (estado.tipo !== 'sin-pedir') void leer(null, [])
  })
  useEffect(() => {
    releer()
  }, [lecturaDelServidor])

  const enElTope = formulas.length >= TOPE_DE_LO_CARGADO
  return {
    estado,
    formulas,
    enElTope,
    // Al abrir la sección: la primera página, o de nuevo si se pidió y se cerró (algo pudo archivarse).
    abrir: () => {
      pedir(null, [])
    },
    verMas:
      estado.tipo === 'lista' && estado.siguiente !== null && !enElTope
        ? () => {
            pedir(estado.siguiente, estado.formulas)
          }
        : null,
    reintentar:
      estado.tipo === 'error'
        ? () => {
            pedir(estado.desde, estado.formulas)
          }
        : null,
  }
}
