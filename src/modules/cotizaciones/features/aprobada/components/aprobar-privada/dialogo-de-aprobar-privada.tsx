'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { DesdeDondeSeAprueba } from '../../../../entities/aprobada/url'
import { aprobarHaciendolaPublica, type PedidoDeAprobar } from '../../hooks/aprobar-la-cotizacion'
import { useAprobarPrivadaPorUrl } from '../../hooks/use-aprobar-privada-por-url'
import { ConfirmarAprobarPrivadaDiferido } from './diferidos'

type Props = {
  // Qué pantalla la abre (`?desde=`): sólo esa la dibuja.
  desde: DesdeDondeSeAprueba
  // Lo que se sabe de la cotización nombrada en `?para=` (número, versión y qué hacer al entrar); nula si esta pantalla no la tiene (todavía no llegó, o ya no está).
  de: (id: string) => Omit<PedidoDeAprobar, 'alSerPrivada'> | null
  pierdeLoNoGuardado?: boolean
  // A dónde vuelve el foco al cerrar (el «⋯» de esa fila); sin él, a quien la abrió.
  focoAlCerrar?: (id: string) => HTMLElement | boolean
}

// La pregunta de aprobar una privada (`?panel=aprobar-privada`), una por pantalla: la abre «Aprobar…» sobre una privada o la respuesta de la base que dice que lo es
// (`alSerPrivada`). Se dibuja cuando la pantalla tiene esa cotización (una que todavía se lee, como «De este vehículo», la abre al llegar) y se pide al abrirse por
// primera vez. Al confirmar vuelve a buscar la cotización: aprueba con la versión de ese momento.
export function DialogoDeAprobarPrivada({
  desde,
  de,
  pierdeLoNoGuardado = false,
  focoAlCerrar,
}: Props) {
  const url = useAprobarPrivadaPorUrl(desde)
  const numero = url.id === null ? null : (de(url.id)?.numero ?? null)
  const abierto = numero !== null
  // Lo último nombrado se conserva mientras se cierra (valores primitivos: `useUltimo` pide un dato estable).
  const idMostrado = useUltimo(abierto ? url.id : null)
  const numeroMostrado = useUltimo(numero)
  const montar = useAbiertoAlgunaVez(abierto)
  if (!montar || idMostrado === null || numeroMostrado === null) {
    return null
  }
  return (
    <ConfirmarAprobarPrivadaDiferido
      abierto={abierto}
      alCerrar={url.cerrar}
      numero={numeroMostrado}
      pierdeLoNoGuardado={pierdeLoNoGuardado}
      focoAlCerrar={focoAlCerrar ? () => focoAlCerrar(idMostrado) : true}
      aprobar={async () => {
        const pedido = de(idMostrado)
        return pedido === null
          ? { error: { codigo: 'conflicto', mensaje: NO_ESTA }, recargar: true }
          : aprobarHaciendolaPublica(pedido)
      }}
    />
  )
}

const NO_ESTA = 'Esa cotización ya no está a la vista. Recarga para ver cómo quedó.'
