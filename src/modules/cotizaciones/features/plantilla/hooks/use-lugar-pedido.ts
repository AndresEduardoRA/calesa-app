'use client'

import { useEffect, useState } from 'react'
import { CLAVE_DEL_LUGAR_PEDIDO } from '../../../entities/llegada-al-editor'
import { esUnLugarDeLaTarjeta } from './use-formulario-de-publicacion-de-la-tarjeta'

function leerElLugar(): string | null {
  if (typeof window === 'undefined') return null
  const lugar = new URL(window.location.href).searchParams.get(CLAVE_DEL_LUGAR_PEDIDO)
  return lugar !== null && esUnLugarDeLaTarjeta(lugar) ? lugar : null
}

// El lugar de la tarjeta que pide la URL al abrir el editor (`…/tarjeta?lugar=celdas.<id>`, el «Ir a la celda» del rechazo de «Activar»): se lee **una vez** (el
// editor recién se dibuja tras hidratar, así que el servidor y el primer dibujo coinciden) y se borra de la URL sin navegar. Lo que no nombra una celda, una fila o
// una columna no se usa.
export function useLugarPedido(): string | null {
  const [lugar] = useState(leerElLugar)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(CLAVE_DEL_LUGAR_PEDIDO)) return
    url.searchParams.delete(CLAVE_DEL_LUGAR_PEDIDO)
    window.history.replaceState(window.history.state, '', url)
  }, [])
  return lugar
}
