'use client'

import { useCallback, useMemo, useState } from 'react'
import type { CatalogoDeTablas } from '../../../entities/compilador'
import type { Formula } from '../../../entities/formula'
import {
  ocupadosDe,
  sumarFila,
  type ErrorDeFilaNueva,
  type PedidoDeFilaNueva,
} from '../../../entities/formula/fila-nueva'

export type FilaSumando = { tras: string; error: ErrorDeFilaNueva | null }

// «Sumar fila» del editor (4.21-3a-2, C5 y C6): hay una sola cosa abierta a la vez (aquí el formulario; `hayAbierta` es la fila en edición). `crear` compila con
// `sumarFila()`: un error deja el formulario abierto, con su error junto a su campo; si entra, la fórmula de trabajo pasa a la nueva (`alCrear`) y `creada` dice
// qué fila nació, para llevarle el foco y no esconderla con «Buscar fila».
export function useSumarFila({
  trabajo,
  tablas,
  hayAbierta,
  alCrear,
}: {
  trabajo: Formula
  // El catálogo de tablas del origen, para BUSCARV.
  tablas: CatalogoDeTablas
  hayAbierta: boolean
  alCrear: (formula: Formula, creada: { id: string; soltados: string[] }) => void
}) {
  const [sumando, setSumando] = useState<FilaSumando | null>(null)
  const [creada, setCreada] = useState<string | null>(null)
  const ocupados = useMemo(() => ocupadosDe(trabajo), [trabajo])

  const crear = useCallback(
    (pedido: Omit<PedidoDeFilaNueva, 'despuesDe'>) => {
      if (sumando === null) return
      const r = sumarFila(trabajo, { ...pedido, despuesDe: sumando.tras, tablas })
      if (!r.ok) {
        setSumando({ tras: sumando.tras, error: r.error })
        return
      }
      alCrear(r.formula, { id: pedido.id, soltados: r.soltados })
      setSumando(null)
      setCreada(pedido.id)
    },
    [sumando, trabajo, tablas, alCrear],
  )

  // Abre el formulario sin mirar lo abierto: lo llama quien ya cerró lo suyo en el mismo manejador (`sumarDebajo` del editor), donde `hayAbierta` aún es el del
  // render anterior. Estables, como los `set`: la planilla los pasa a filas `memo`.
  const abrirFormulario = useCallback((tras: string) => {
    setCreada(null)
    setSumando({ tras, error: null })
  }, [])
  const soltarLaCreada = useCallback(() => {
    setCreada(null)
  }, [])
  const cancelarSumar = useCallback(() => {
    setSumando(null)
  }, [])

  return {
    sumando,
    creada,
    ocupados,
    sumar: (tras: string) => {
      if (!hayAbierta && sumando === null) {
        setCreada(null)
        setSumando({ tras, error: null })
      }
    },
    abrirFormulario,
    cancelarSumar,
    soltarLaCreada,
    crear,
  }
}
