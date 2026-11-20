'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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

// Pliega y despliega el menú lateral al instante y guarda cada cambio. Sin conexión el cambio queda en la pantalla y el último valor se guarda
// al volver la red (`useReintentoAlVolver`); si falla con red, igual vale en esta pestaña, como las demás preferencias.
export function ProveedorDelMenuPlegado({ inicial, alGuardar, children }: Props) {
  const [plegado, setPlegado] = useState(inicial === true)
  const [pendiente, setPendiente] = useState<{ plegado: boolean } | null>(null)

  // La copia para la cáscara de carga: la del servidor manda, también en un dispositivo nuevo.
  useEffect(() => {
    document.cookie = cookieDelMenuPlegado(plegado)
  }, [plegado])

  const enviar = useCallback(
    async (envio: { plegado: boolean }): Promise<boolean> => {
      const guardado = await alGuardar(envio.plegado)
      setPendiente((actual) => (guardado && actual === envio ? null : actual))
      return guardado
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
