'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { useState, type Ref } from 'react'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import { avisar } from '@/shared/ui/toasts'

// Copia un texto al portapapeles y lo dice en el botón (`copiado`, «Copiado» si no se dice otra cosa). Si el navegador no deja, pide
// copiarlo a mano (el texto está a la vista y se puede seleccionar).
export function BotonCopiar({
  texto,
  etiqueta,
  copiado: textoCopiado = 'Copiado',
  variante = 'outline',
  className,
  ref,
}: {
  texto: string
  etiqueta: string
  copiado?: string
  variante?: 'outline' | 'default'
  className?: string
  ref?: Ref<HTMLButtonElement>
}) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      avisar('No pudimos copiar: selecciónalo y cópialo a mano.')
    }
  }
  return (
    <Button
      ref={ref}
      type="button"
      variant={variante}
      className={cn('h-11 md:h-8', className)}
      onClick={() => void copiar()}
      onBlur={() => {
        setCopiado(false)
      }}
    >
      {copiado ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      <span aria-live="polite">{copiado ? textoCopiado : etiqueta}</span>
    </Button>
  )
}
