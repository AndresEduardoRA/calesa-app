'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { avisarExito } from '@/shared/ui/toasts'
import { ModalDeOportunidadRapidaDiferido } from './diferidos'

type Props = {
  leadId: string
  nombre: string
  abierto: boolean
  alCerrar: () => void
  // Después de crear (la ficha se vuelve a leer).
  alCrear?: (() => void) | undefined
}

// A dónde vuelve el foco al cerrar: el «⋯» de este lead; si hay más de uno, el último que se ve.
const menuDelLead = (leadId: string) => (): HTMLElement | boolean => {
  const menus = document.querySelectorAll<HTMLElement>(`[data-mas-acciones="${leadId}"]`)
  return Array.from(menus).findLast((menu) => menu.offsetParent !== null) ?? true
}

// «Nueva oportunidad…» desde la ficha de un lead (`?panel=oportunidad-rapida`; el lead ya es el de la pantalla, sin `para`): el mismo
// modal de la lista, con su aviso. Se monta la primera vez que se abre y cada apertura empieza de nuevo (lee el aviso otra vez).
export function NuevaOportunidadDelLead({ leadId, nombre, abierto, alCerrar, alCrear }: Props) {
  const apertura = useApertura(abierto)
  const montar = useAbiertoAlgunaVez(abierto)
  if (!montar) {
    return null
  }
  return (
    <ModalDeOportunidadRapidaDiferido
      key={apertura}
      abierto={abierto}
      alCerrar={alCerrar}
      leadId={leadId}
      nombreDelLead={nombre}
      alCrear={() => {
        avisarExito(`Oportunidad creada para «${nombre}».`)
        alCerrar()
        alCrear?.()
      }}
      focoAlCerrar={menuDelLead(leadId)}
    />
  )
}
