'use client'

import { Aviso } from '@/shared/ui/aviso'
import { irAlBloque } from '@/shared/ui/ficha-en-bloques'
import { TOPE_DE_VENCIDOS } from '../../../entities/ficha'

type Props = { vencidos: number }

// Hasta el tope, el número; más allá, «más de 20» (la base no cuenta más).
export function textoDeVencidos(vencidos: number): string {
  if (vencidos > TOPE_DE_VENCIDOS) {
    return `Tienes más de ${String(TOPE_DE_VENCIDOS)} recordatorios vencidos sobre este lead.`
  }
  return vencidos === 1
    ? 'Tienes 1 recordatorio vencido sobre este lead.'
    : `Tienes ${String(vencidos)} recordatorios vencidos sobre este lead.`
}

// Los recordatorios propios que ya pasaron y no se completaron, dichos arriba de la ficha, a lo ancho (vienen en `lead_ficha()`: no
// cuesta otra lectura). «Verlos» salta al bloque «Seguimientos y recordatorios» de la misma página, sin navegar.
export function AvisoDeVencidos({ vencidos }: Props) {
  if (vencidos === 0) {
    return null
  }
  return (
    <Aviso tono="aviso">
      <span>
        {textoDeVencidos(vencidos)}{' '}
        <a
          href="#seguimientos"
          className="font-medium underline underline-offset-2"
          onClick={(evento) => {
            if (irAlBloque('seguimientos')) {
              evento.preventDefault()
            }
          }}
        >
          Verlos
        </a>
      </span>
    </Aviso>
  )
}
