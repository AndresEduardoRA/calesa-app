'use client'

import { useEffect, useRef } from 'react'

// Un enlace con ancla (`/perfil#notificaciones`) abre el modal de esa tarjeta: al montarse, si la URL trae la ancla, la quita (para que recargar o cerrar no lo
// reabra) y abre el panel por la URL (`?panel=`). El servidor no ve el `#`, por eso se mira acá.
export function useAbrirPorAncla(ancla: string, abrir: () => void): void {
  const abrirAhora = useRef(abrir)
  useEffect(() => {
    abrirAhora.current = abrir
  })
  useEffect(() => {
    if (window.location.hash === `#${ancla}`) {
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
      abrirAhora.current()
    }
  }, [ancla])
}
