'use client'

import { useRouter } from 'next/navigation'
import { useState, type ComponentProps } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { AVISO_AL_APROBAR } from '../../../../entities/privada'
import type { FalloDeAprobar } from '../../hooks/aprobar-la-cotizacion'

type Props = {
  abierto: boolean
  alCerrar: () => void
  numero: number
  // Aprueba haciéndola pública (`aprobarHaciendolaPublica()`); devuelve lo que no entró, para decirlo acá.
  aprobar: () => Promise<FalloDeAprobar | null>
  // En la guardada: la versión cambia y la página se vuelve a leer, así que lo tipeado sin guardar se pierde (como al marcar final).
  pierdeLoNoGuardado: boolean
  focoAlCerrar: ComponentProps<typeof Confirmar>['focoAlCerrar']
}

const LO_NO_GUARDADO = ' Se aprueba lo guardado: lo que escribiste y no guardaste se pierde.'

// La pregunta antes de aprobar una privada (glosario: «Cotización privada»): nombra la cotización y dice que deja de ser privada. Mientras aprueba no se cierra ni vuelve a
// enviar. Si entra, cierra (el aviso con «Deshacer» ya salió); si no, sigue abierta con el motivo y, si pide recargar (otra persona la cambió), «Recargar».
export function ConfirmarAprobarPrivada({
  abierto,
  alCerrar,
  numero,
  aprobar,
  pierdeLoNoGuardado,
  focoAlCerrar,
}: Props) {
  const router = useRouter()
  const [enCurso, setEnCurso] = useState(false)
  const [fallo, setFallo] = useState<FalloDeAprobar | null>(null)

  function cerrar() {
    setFallo(null)
    alCerrar()
  }

  async function confirmar() {
    setFallo(null)
    setEnCurso(true)
    const noEntro = await aprobar()
    setEnCurso(false)
    if (noEntro) {
      setFallo(noEntro)
      return
    }
    alCerrar()
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={`Aprobar la cotización n.º ${String(numero)}`}
      descripcion={AVISO_AL_APROBAR + (pierdeLoNoGuardado ? LO_NO_GUARDADO : '')}
      etiquetaConfirmar={enCurso ? 'Aprobando…' : 'Aprobar'}
      enCurso={enCurso}
      deshabilitado={fallo?.recargar === true}
      focoAlCerrar={focoAlCerrar}
    >
      {fallo === null ? null : (
        <Aviso tono={fallo.error.codigo === 'conflicto' ? 'aviso' : 'peligro'}>
          <p>{fallo.error.mensaje}</p>
          {fallo.recargar ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 min-h-11 md:min-h-7"
              onClick={() => {
                router.refresh()
                cerrar()
              }}
            >
              Recargar
            </Button>
          ) : null}
        </Aviso>
      )}
    </Confirmar>
  )
}
