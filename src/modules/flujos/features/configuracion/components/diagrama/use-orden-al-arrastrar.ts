'use client'

import { useCallback, useRef, useState } from 'react'
import type { MedidasDelDiagrama } from '../../../../entities/disposicion-del-diagrama'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../../entities/flujo'
import {
  columnaAlSoltar,
  despuesDeAlSoltar,
  ordenAlSoltar,
} from '../../../../entities/vista-del-diagrama'
import { MOTIVO_SIN_ORDEN_AQUI, useOrdenDeFases } from '../../hooks/use-orden-de-fases'

// Ordenar arrastrando: la caja se mueve sólo de costado; al soltarla el orden nuevo se ve en el acto y se escribe con `fase_mover` (por el hueco del área
// `fases`); si falla, vuelve atrás. El orden en pantalla vive aquí hasta que llega la versión nueva del flujo (se reinicia con el orden leído y la versión).
// Se apaga sin el proveedor, con la lista cortada o con otro envío en curso.
export function useOrdenAlArrastrar(flujo: FlujoParaConfigurar, medidas: MedidasDelDiagrama) {
  const orden = useOrdenDeFases()
  // El orden leído y la versión (el núcleo no importa el área `fases`, que tiene su propia firma del orden).
  const clave = `${flujo.fases.map((f) => f.id).join('|')}:${flujo.version}`
  const [enPantalla, setEnPantalla] = useState<{
    clave: string
    fases: FaseParaConfigurar[]
  } | null>(null)
  const fases = enPantalla?.clave === clave ? enPantalla.fases : flujo.fases
  const [cae, setCae] = useState<{ id: string; columna: number } | null>(null)
  const arrastro = useRef(false)
  const vieneDeArrastrar = useCallback(() => arrastro.current, [])
  const motivo = orden === null ? MOTIVO_SIN_ORDEN_AQUI : orden.motivo
  const columnaDe = (x: number) => columnaAlSoltar(x + medidas.ancho / 2, medidas, fases.length)

  return {
    fases,
    motivo,
    puedeArrastrar: orden !== null && orden.motivo === null && !orden.enCurso && fases.length > 1,
    // Dónde cae la que se arrastra (para el indicador).
    cae,
    vieneDeArrastrar,
    alArrastrar: (id: string, x: number) => {
      arrastro.current = true
      const columna = columnaDe(x)
      setCae((antes) => (antes?.id === id && antes.columna === columna ? antes : { id, columna }))
    },
    alSoltar: async (id: string, x: number) => {
      setCae(null)
      // El clic que sigue al soltar todavía viene del arrastre.
      setTimeout(() => {
        arrastro.current = false
      }, 0)
      const columna = columnaDe(x)
      const destino = despuesDeAlSoltar(
        fases.map((f) => f.id),
        id,
        columna,
      )
      if (destino === null || orden === null) {
        return
      }
      setEnPantalla({ clave, fases: ordenAlSoltar(fases, id, columna) })
      if (!(await orden.mover(id, destino.despuesDe))) {
        setEnPantalla(null)
      }
    },
  }
}
