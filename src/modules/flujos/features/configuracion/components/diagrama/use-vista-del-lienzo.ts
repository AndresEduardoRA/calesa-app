'use client'

import { useReactFlow } from '@xyflow/react'
import { useEffect, useEffectEvent, useState, type RefObject } from 'react'
import { CORTE_DEL_PANEL } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import type { DisposicionDelDiagrama } from '../../../../entities/disposicion-del-diagrama'
import { centroParaVerLaFase, vistaInicial } from '../../../../entities/vista-del-diagrama'

// Lo que tapa el panel al costado (`<Drawer ancho="amplio">`, `sm:max-w-xl`).
const ANCHO_DEL_PANEL_EN_REM = 36
export const sinAnimar = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// La vista del lienzo: al iniciar, la de `vistaInicial` (todo si entra; si no, el principio o la fase abierta); al abrir una fase con el panel al costado,
// la fase en medio de lo que el panel no tapa (sin animar con `prefers-reduced-motion`).
export function useVistaDelLienzo(
  contenedor: RefObject<HTMLElement | null>,
  disposicion: DisposicionDelDiagrama,
  { faseAbierta, rem }: { faseAbierta: string | null; rem: number },
) {
  const { setViewport, setCenter, getZoom } = useReactFlow()
  const [listo, setListo] = useState(false)
  const alCostado = useAlMenos(CORTE_DEL_PANEL)
  const centrar = useEffectEvent((faseId: string) => {
    const caja = contenedor.current?.getBoundingClientRect()
    if (!listo || !alCostado || !caja) return
    const tapado = Math.max(0, caja.right - (window.innerWidth - ANCHO_DEL_PANEL_EN_REM * rem))
    const zoom = getZoom()
    const centro = centroParaVerLaFase(disposicion, faseId, tapado, zoom)
    if (centro) void setCenter(centro.x, centro.y, { zoom, duration: sinAnimar() ? 0 : 300 })
  })
  useEffect(() => {
    if (faseAbierta !== null) centrar(faseAbierta)
  }, [faseAbierta, listo])
  // Al iniciar React Flow (un evento, no un dibujo).
  return () => {
    const caja = contenedor.current?.getBoundingClientRect()
    if (caja) {
      void setViewport(
        vistaInicial(disposicion, { ancho: caja.width, alto: caja.height }, faseAbierta),
      )
    }
    setListo(true)
  }
}
