'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

const BOTON = 'h-11 md:h-8'

type Props = {
  alCerrar: () => void
  // Lo que da el `id` de «Nuevo» (`<prefijo>-nuevo`: el foco inicial del modal) y el del aviso del tope (`<prefijo>-tope`).
  prefijo: string
  etiqueta: string
  alNuevo: () => void
  // Al tope, «Nuevo» se apaga y apunta a su aviso.
  alTope: boolean
  // La lista vacía ya ofrece su propio «Nuevo»: el pie no lo repite.
  sinNuevo?: boolean
}

// El pie del modal de una lista de catálogo (Configuración › Leads): «Cerrar» y, a su lado, la acción principal «Nuevo <x>».
export function PieDeLaLista({
  alCerrar,
  prefijo,
  etiqueta,
  alNuevo,
  alTope,
  sinNuevo = false,
}: Props) {
  return (
    <>
      <Button variant="ghost" className={BOTON} onClick={alCerrar}>
        Cerrar
      </Button>
      {sinNuevo ? null : (
        <Button
          id={`${prefijo}-nuevo`}
          className={BOTON}
          disabled={alTope}
          aria-describedby={alTope ? `${prefijo}-tope` : undefined}
          onClick={alNuevo}
        >
          <PlusIcon aria-hidden />
          {etiqueta}
        </Button>
      )}
    </>
  )
}
