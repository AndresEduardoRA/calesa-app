'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type {
  AccionDeRequisito,
  AccionesDelRequisito,
} from '../../../entities/mover/accion-de-requisito'
import {
  CLAVE_DE_LA_FALTA,
  CLAVE_DE_PEDIR,
  PANEL_PEDIR,
  YA_NO_FALTA,
} from '../../../entities/mover/textos'

export type PedidoDelRequisito = Extract<AccionDeRequisito, { tipo: 'pedir' }>

function pedidoDe(resueltas: AccionesDelRequisito | undefined): PedidoDelRequisito | null {
  if (!resueltas) return null
  const pedir = [resueltas.principal, ...resueltas.mas].find((a) => a?.tipo === 'pedir')
  return pedir?.tipo === 'pedir' ? pedir : null
}

// «Pedirlo» en la URL (`?pedir=requisito&falta=<id>`): se puede recargar y «atrás» lo cierra. Se revisa al abrir contra la última lectura de «Qué falta»: si
// ese requisito ya no se puede pedir (se cumplió, cambió la fase), «Eso ya no falta.» y se cierra. Mientras se va, conserva el último pedido.
export function usePedirloPorUrl(acciones: Readonly<Record<string, AccionesDelRequisito>>) {
  const url = usePanelPorUrl(PANEL_PEDIR, [CLAVE_DE_LA_FALTA], { clave: CLAVE_DE_PEDIR })
  const falta = url.valor(CLAVE_DE_LA_FALTA)
  const apertura = useApertura(url.abierto)
  const pedido = falta === null ? null : pedidoDe(acciones[falta])
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${falta ?? ''}` : null,
    url.abierto && pedido === null ? YA_NO_FALTA : null,
    url.cerrar,
  )
  const abierto = url.abierto && !rechazada && pedido !== null
  const ultimo = useUltimo(abierto ? pedido : null)
  return { abierto, apertura, pedido: abierto ? pedido : ultimo, cerrar: url.cerrar }
}
