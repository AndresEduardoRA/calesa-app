'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cookieDelMenuPlegado } from '@/shared/lib/menu-plegado'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { ContextoDelMenuPlegado, type MenuPlegado } from '../hooks/use-menu-plegado'

type Props = {
  // Lo que dejó la persona (leído en el servidor: la barra se dibuja ya como la dejó). null = nunca eligió: desplegado.
  inicial: boolean | null
  // Guarda la preferencia; verdadero si quedó guardada.
  alGuardar: (plegado: boolean) => Promise<boolean>
  children: ReactNode
}

// Pliega y despliega el menú lateral al instante y guarda cada cambio. Hay un solo guardado en vuelo: dos toques seguidos no mandan dos pedidos que
// puedan llegar al revés, sino que al terminar uno se manda el último valor si cambió. Sin conexión el cambio queda en la pantalla y el último valor
// se guarda al volver la red (`useReintentoAlVolver`); si falla con red, igual vale en esta pestaña, como las demás preferencias.
export function ProveedorDelMenuPlegado({ inicial, alGuardar, children }: Props) {
  const [plegado, setPlegado] = useState(inicial === true)
  const [pendiente, setPendiente] = useState<{ plegado: boolean } | null>(null)
  const deseado = useRef<boolean | null>(null)
  const enVuelo = useRef(false)

  // La copia para la cáscara de carga: la del servidor manda, también en un dispositivo nuevo.
  useEffect(() => {
    document.cookie = cookieDelMenuPlegado(plegado)
  }, [plegado])

  // Manda el valor deseado hasta que lo último enviado sea lo último pedido. Falso si un envío no quedó guardado.
  const enviar = useCallback(
    async (envio: { plegado: boolean }): Promise<boolean> => {
      deseado.current = envio.plegado
      if (enVuelo.current) {
        return true
      }
      enVuelo.current = true
      try {
        // El valor pedido cambia mientras se espera la respuesta: se lee por una función, no se da por sabido.
        const pedido = (): boolean | null => deseado.current
        let enviado: boolean | null = null
        for (
          let siguiente = pedido();
          siguiente !== null && siguiente !== enviado;
          siguiente = pedido()
        ) {
          if (!(await alGuardar(siguiente))) {
            return false
          }
          enviado = siguiente
          if (pedido() === siguiente) {
            setPendiente(null)
          }
        }
        return true
      } finally {
        enVuelo.current = false
      }
    },
    [alGuardar],
  )
  useReintentoAlVolver(pendiente, enviar)

  const alternar = useCallback(() => {
    const envio = { plegado: !plegado }
    setPlegado(envio.plegado)
    setPendiente(envio)
    void enviar(envio)
  }, [plegado, enviar])

  const valor = useMemo<MenuPlegado>(() => ({ plegado, alternar }), [plegado, alternar])
  return <ContextoDelMenuPlegado value={valor}>{children}</ContextoDelMenuPlegado>
}
