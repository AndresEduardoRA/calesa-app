'use client'

import { BadgeCheckIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { buttonVariants } from '@/shared/ui/button'
import { aprobarLaCotizacion } from '../hooks/aprobar-la-cotizacion'
import { avisarAprobada, useAlCambiarLaAprobada } from '../hooks/aprobada-del-vehiculo'
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
}

// «Aprobar» en la cabecera de la guardada, y la insignia cuando lo es. Una isla porque comparten estado: al entrar, el botón pasa a la insignia sin refrescar la página
// (remontaría lo tipeado) y «Deshacer» lo devuelve. Un `<button>` con las clases de `<Button>`, sin el primitivo de Base UI. Un envío a la vez. Apagado, dice su motivo al
// lado (`aria-describedby`). Avisa a las otras islas del vehículo (`aprobada-del-vehiculo.ts`) y se pone al día con las suyas.
export function BotonAprobar({
  id,
  numero,
  actualizadoEn,
  aprobada: inicial,
  motivo,
  vehiculoId = null,
}: Props) {
  const idDelMotivo = useId()
  const fuente = useId()
  const [aprobada, setAprobada] = useState(inicial)
  const [enCurso, setEnCurso] = useState(false)
  useAlCambiarLaAprobada(vehiculoId, fuente, (aprobadaId) => {
    setAprobada(aprobadaId === id)
  })
  const alCambiar = (esLaAprobada: boolean, aprobadaId: string) => {
    setAprobada(esLaAprobada)
    if (vehiculoId !== null) {
      avisarAprobada({ vehiculoId, aprobadaId, fuente })
    }
  }
  if (aprobada) {
    return <InsigniaAprobada />
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
        disabled={motivo !== null || enCurso}
        aria-describedby={motivo === null ? undefined : idDelMotivo}
        onClick={() => {
          setEnCurso(true)
          void aprobarLaCotizacion({ id, numero, actualizadoEn, alCambiar }).finally(() => {
            setEnCurso(false)
          })
        }}
      >
        <BadgeCheckIcon aria-hidden />
        {enCurso ? 'Aprobando…' : 'Aprobar'}
      </button>
      {motivo === null ? null : (
        <span id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </span>
      )}
    </span>
  )
}
