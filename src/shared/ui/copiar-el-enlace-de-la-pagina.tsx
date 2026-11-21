'use client'

import { Share2Icon } from 'lucide-react'
import { useState } from 'react'
import { copiarTexto } from '@/shared/lib/compartir'
import { Button } from './button'
import { diferido } from './diferido'
import { avisarExito } from './toasts'
import { useAbiertoAlgunaVez } from './use-abierto-alguna-vez'

// El modal de respaldo se pide sólo si el portapapeles falla.
const ModalDelEnlaceDiferido = diferido(
  () => import('./modal-del-enlace').then((modulo) => modulo.ModalDelEnlace),
  { aviso: 'pantalla' },
)

// «Copiar el enlace de esta página»: el botón flotante secundario (más chico y sin relleno de acento) que va a la izquierda del botón del chat. Copia la URL de
// ahora (con su consulta) y avisa «Enlace copiado.»; si el navegador no deja (portapapeles bloqueado o sin él), un modal con el enlace seleccionado.
export function CopiarElEnlaceDeLaPagina() {
  const [enlace, setEnlace] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)
  const montado = useAbiertoAlgunaVez(abierto)

  const copiar = async () => {
    const url = window.location.href
    try {
      await copiarTexto(url)
      avisarExito('Enlace copiado.')
    } catch {
      setEnlace(url)
      setAbierto(true)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-lg"
        className="size-[44px] rounded-full bg-(--color-surface) text-(--color-ink-soft) shadow-(--shadow-md) hover:text-(--color-ink) md:size-9"
        aria-label="Copiar el enlace de esta página"
        title="Copiar el enlace de esta página"
        onClick={() => {
          void copiar()
        }}
      >
        <Share2Icon aria-hidden />
      </Button>
      {montado && enlace !== null ? (
        <ModalDelEnlaceDiferido
          abierto={abierto}
          alCerrar={() => {
            setAbierto(false)
          }}
          enlace={enlace}
        />
      ) : null}
    </>
  )
}
