'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { leerMasPendientes } from '../../../composicion-pendientes.client'
import {
  cursorDePendientes,
  type GrupoDePendientes,
  type PendienteDeAgenda,
} from '../../../entities/pendientes'

const SIN_RED: ErrorApp = { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' }

type Pedido = {
  grupo: GrupoDePendientes
  // La última fila que dibujó el servidor `(orden, id)`: desde ahí sigue la primera página de aquí.
  desdeEn: string
  desdeId: string
  hasta: string
  // Lo que ya está dibujado: el tope de lo cargado lo cuenta también.
  yaCargadas: number
}

// Las páginas que siguen de un grupo de pendientes («Ver más»): la primera se lee al montarse (se monta al tocar «Ver más») y las demás, desde el cursor de la
// última fila. Una lectura a la vez; un error no pierde lo cargado; hasta `TOPE_DE_LO_CARGADO` contando lo que dibujó el servidor.
export function usePaginasDePendientes({ grupo, desdeEn, desdeId, hasta, yaCargadas }: Pedido) {
  const [filas, setFilas] = useState<PendienteDeAgenda[]>([])
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<ErrorApp | null>(null)
  // Una lectura a la vez; y una página que llega tras desmontar se descarta.
  const enVuelo = useRef(false)
  const vivo = useRef(true)

  const leer = useCallback(
    async (actuales: readonly PendienteDeAgenda[]) => {
      if (enVuelo.current) {
        return
      }
      enVuelo.current = true
      setCargando(true)
      setError(null)
      try {
        const cursor = cursorDePendientes(actuales) ?? { en: desdeEn, id: desdeId }
        const leida = await leerMasPendientes({ grupo, cursor, hasta }).catch(() => null)
        if (!vivo.current) {
          return
        }
        if (!leida?.ok) {
          setError(leida?.error ?? SIN_RED)
          return
        }
        setFilas([...actuales, ...leida.data.filas])
        setHayMas(leida.data.hayMas)
      } finally {
        enVuelo.current = false
        if (vivo.current) {
          setCargando(false)
        }
      }
    },
    [grupo, desdeEn, desdeId, hasta],
  )

  // Al montarse (los datos del pedido no cambian mientras está montado): la lectura posterior es «Ver más» o «Reintentar».
  useEffect(() => {
    vivo.current = true
    void leer([])
    return () => {
      vivo.current = false
    }
  }, [leer])

  return {
    filas,
    hayMas,
    cargando,
    error,
    enElTope: yaCargadas + filas.length >= TOPE_DE_LO_CARGADO,
    verMas: () => void leer(filas),
    reintentar: () => void leer(filas),
  }
}
