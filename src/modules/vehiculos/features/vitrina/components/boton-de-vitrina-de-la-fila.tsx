'use client'

import { GlobeIcon, GlobeLockIcon } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import { avisar } from '@/shared/ui/toasts'
import type { DeLaFila } from '../../../entities/vitrina-rapida'
import { useSacarDeLaWeb } from '../hooks/use-sacar-de-la-web'

type Props = {
  vehiculo: DeLaFila
  alPublicar: () => void
  // Por qué no se puede (sin `vehiculos.vitrina` del origen): el botón queda apagado y enfocable, con el motivo para el lector y en un aviso al
  // tocarlo. En la lista, sin el permiso el botón no se dibuja; en la ficha, sí.
  motivo?: string | null
  className?: string
}

// Publicar o sacar de la web en la fila o la tarjeta del inventario y en la ficha. Sacar se hace ahí, con un toque y «Deshacer»; publicar abre el
// panel completo de la vitrina (`?panel=vitrina`, `alPublicar`).
export function BotonDeVitrinaDeLaFila({ vehiculo, alPublicar, motivo = null, className }: Props) {
  const web = useSacarDeLaWeb()
  const idDelMotivo = useId()
  const publicado = vehiculo.publicadoWeb
  const etiqueta = publicado
    ? `Sacar «${vehiculo.titulo}» de la web`
    : `Publicar «${vehiculo.titulo}» en la web`
  const apagado = motivo !== null
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          'size-11 md:size-7',
          apagado && 'cursor-not-allowed opacity-50 hover:bg-transparent',
          className,
        )}
        aria-label={etiqueta}
        title={motivo ?? etiqueta}
        aria-disabled={apagado ? 'true' : undefined}
        aria-describedby={apagado ? idDelMotivo : undefined}
        disabled={web.enCurso}
        onClick={() => {
          if (apagado) avisar(motivo)
          else if (publicado) void web.sacar(vehiculo)
          else alPublicar()
        }}
      >
        {publicado ? <GlobeLockIcon aria-hidden /> : <GlobeIcon aria-hidden />}
      </Button>
      {apagado ? (
        <span id={idDelMotivo} className="sr-only">
          {motivo}
        </span>
      ) : null}
    </>
  )
}
