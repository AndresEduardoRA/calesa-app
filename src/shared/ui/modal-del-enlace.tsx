'use client'

import { useRef } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Modal } from './modal'

type Props = {
  abierto: boolean
  alCerrar: () => void
  enlace: string
}

// Cuando el navegador no deja copiar (portapapeles bloqueado), el enlace queda a la vista y seleccionado para copiarlo con Ctrl/Cmd+C.
export function ModalDelEnlace({ abierto, alCerrar, enlace }: Props) {
  const campo = useRef<HTMLInputElement>(null)
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Copia el enlace de esta página"
      descripcion="Este navegador no dejó copiarlo solo. Selecciónalo y cópialo."
      ancho="amplio"
      focoInicial={campo}
      pie={
        <Button variant="outline" onClick={alCerrar}>
          Cerrar
        </Button>
      }
    >
      <Input
        ref={campo}
        readOnly
        aria-label="Enlace de esta página"
        value={enlace}
        onFocus={(evento) => {
          evento.currentTarget.select()
        }}
        className="h-11 sm:h-8"
      />
    </Modal>
  )
}
