'use client'

import { GlobeIcon, GlobeLockIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { DeLaFila } from '../../../entities/vitrina-rapida'
import { useSacarDeLaWeb } from '../hooks/use-sacar-de-la-web'

// Publicar o sacar de la web en la fila o la tarjeta del inventario (con `vehiculos.vitrina` del origen; si no, no está). Sacar se hace ahí, con un
// toque y «Deshacer»; publicar abre el panel completo de la vitrina (`?panel=vitrina&para=<id>`, `alPublicar`), el mismo de la ficha.
export function BotonDeVitrinaDeLaFila({
  vehiculo,
  alPublicar,
}: {
  vehiculo: DeLaFila
  alPublicar: () => void
}) {
  const web = useSacarDeLaWeb()
  const publicado = vehiculo.publicadoWeb
  const etiqueta = publicado
    ? `Sacar «${vehiculo.titulo}» de la web`
    : `Publicar «${vehiculo.titulo}» en la web`
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-11 md:size-7"
      aria-label={etiqueta}
      title={etiqueta}
      disabled={web.enCurso}
      onClick={() => {
        if (publicado) void web.sacar(vehiculo)
        else alPublicar()
      }}
    >
      {publicado ? <GlobeLockIcon aria-hidden /> : <GlobeIcon aria-hidden />}
    </Button>
  )
}
