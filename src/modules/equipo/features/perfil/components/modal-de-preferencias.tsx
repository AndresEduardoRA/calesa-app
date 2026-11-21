'use client'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { ControlesDeVistos } from '../../vistos/components/vistos-del-perfil'
import { ControlesDePreferencias } from './preferencias-perfil'
import { CampoDeZonaHoraria } from './zona-del-perfil'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La zona horaria elegida (`null` = la de la empresa).
  zonaElegida: string | null
}

// «Preferencias» (`?panel=preferencias`): cada cambio se aplica y se guarda al elegirlo, así que no hay «Guardar»: sólo «Listo».
export function ModalDePreferencias({ abierto, alCerrar, zonaElegida }: Props) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Preferencias"
      descripcion="Valen para tu cuenta, en cualquier dispositivo. Se guardan al elegirlas."
      pie={<Button onClick={alCerrar}>Listo</Button>}
    >
      <ControlesDePreferencias />
      <CampoDeZonaHoraria elegida={zonaElegida} />
      <ControlesDeVistos />
    </Modal>
  )
}
