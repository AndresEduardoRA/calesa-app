'use client'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { CuerpoDeNumerosRepetidos } from './cuerpo-de-numeros-repetidos'

type Props = {
  abierto: boolean
  alCerrar: () => void
}

// «Números repetidos» (`?panel=numeros-repetidos`): los números que hoy se repiten entre leads, con la regla de los teléfonos extra encendida. Sólo se
// mira: no guarda nada.
export function ModalDeNumerosRepetidos({ abierto, alCerrar }: Props) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Números repetidos"
      descripcion="Los números que hoy se repiten entre leads."
      pie={
        <Button variant="ghost" className="h-11 md:h-8" onClick={alCerrar}>
          Cerrar
        </Button>
      }
    >
      <CuerpoDeNumerosRepetidos />
    </Modal>
  )
}
