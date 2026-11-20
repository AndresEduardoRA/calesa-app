'use client'

import { BadgeCheckIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { buttonVariants } from '@/shared/ui/button'
import { aprobarLaCotizacion } from '../hooks/aprobar-la-cotizacion'
import { avisarAprobada, useAlCambiarLaAprobada } from '../hooks/aprobada-del-vehiculo'
import { useAprobarPrivadaPorUrl } from '../hooks/use-aprobar-privada-por-url'
import { DialogoDeAprobarPrivada } from './aprobar-privada/dialogo-de-aprobar-privada'
import { InsigniaAprobada } from './insignia-aprobada'

type Props = {
  id: string
  numero: number
  // La versión de la cotización (el texto de la base): con ella se aprueba y se vuelve a aprobar la anterior.
  actualizadoEn: string
  aprobada: boolean
  // Por qué no se puede aprobar (sin vehículo, inválida, sin lectura); nulo = se puede.
  motivo: string | null
  // El vehículo de la cotización: si «De este vehículo» aprueba otra (o la devuelve), el botón se pone al día.
  vehiculoId?: string | null
  // Una privada (glosario: «Cotización privada»): «Aprobar…» pregunta antes, porque deja de serlo.
  privada?: boolean
}

// Si es la aprobada, al día con las otras islas del vehículo: lo que cambia acá se les avisa y lo que cambian ellas llega acá.
function useAprobadaDeLaIsla(id: string, inicial: boolean, vehiculoId: string | null) {
  const fuente = useId()
  const [aprobada, setAprobada] = useState(inicial)
  useAlCambiarLaAprobada(vehiculoId, fuente, (aprobadaId) => {
    setAprobada(aprobadaId === id)
  })
  const alCambiar = (esLaAprobada: boolean, aprobadaId: string) => {
    setAprobada(esLaAprobada)
    if (vehiculoId !== null) {
      avisarAprobada({ vehiculoId, aprobadaId, fuente })
    }
  }
  return { aprobada, alCambiar }
}

// «Aprobar» en la cabecera de la guardada, y la insignia cuando lo es. Una isla porque comparten estado: al entrar, el botón pasa a la insignia sin refrescar la página
// (remontaría lo tipeado) y «Deshacer» lo devuelve. Un `<button>` con las clases de `<Button>`, sin el primitivo de Base UI. Un envío a la vez. Apagado, dice su motivo al
// lado (`aria-describedby`). Avisa a las otras islas del vehículo (`aprobada-del-vehiculo.ts`) y se pone al día con las suyas. Una privada pregunta antes
// (`DialogoDeAprobarPrivada`) y, al entrar, la página se vuelve a leer: la versión cambió y la insignia «Privada» se va.
export function BotonAprobar({
  id,
  numero,
  actualizadoEn,
  aprobada: inicial,
  motivo,
  vehiculoId = null,
  privada = false,
}: Props) {
  const router = useRouter()
  const pregunta = useAprobarPrivadaPorUrl('guardada')
  const idDelMotivo = useId()
  const { aprobada, alCambiar } = useAprobadaDeLaIsla(id, inicial, vehiculoId)
  const [enCurso, setEnCurso] = useState(false)
  // Aprobar una privada la hizo pública: la versión cambió y la página se vuelve a leer.
  const alCambiarLaPublica = (esLaAprobada: boolean, aprobadaId: string) => {
    alCambiar(esLaAprobada, aprobadaId)
    router.refresh()
  }
  const dialogo = (
    <DialogoDeAprobarPrivada
      desde="guardada"
      de={(cual) =>
        cual === id ? { id, numero, actualizadoEn, alCambiar: alCambiarLaPublica } : null
      }
      pierdeLoNoGuardado
    />
  )
  if (aprobada) {
    return (
      <>
        <InsigniaAprobada />
        {dialogo}
      </>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
        disabled={motivo !== null || enCurso}
        aria-describedby={motivo === null ? undefined : idDelMotivo}
        onClick={() => {
          if (privada) {
            pregunta.abrir(id)
            return
          }
          setEnCurso(true)
          void aprobarLaCotizacion({
            id,
            numero,
            actualizadoEn,
            alCambiar,
            alSerPrivada: () => {
              pregunta.abrir(id)
            },
          }).finally(() => {
            setEnCurso(false)
          })
        }}
      >
        <BadgeCheckIcon aria-hidden />
        {enCurso ? 'Aprobando…' : privada ? 'Aprobar…' : 'Aprobar'}
      </button>
      {motivo === null ? null : (
        <span id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </span>
      )}
      {dialogo}
    </span>
  )
}
