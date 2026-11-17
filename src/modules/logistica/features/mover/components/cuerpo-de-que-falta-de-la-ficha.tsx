'use client'

import type { DestinoConVista } from '@/modules/flujos/client'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import {
  HAY_MAS_DESTINOS,
  SIN_CONEXION_EN_QUE_FALTA,
  SIN_DESTINOS,
  SIN_FASE,
} from '../../../entities/mover/textos'
import { textoDeDiasEnLaFase } from '../../../entities/nucleo/dias-en-la-fase'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import type { QueFalta } from '../actions/leer-que-falta'
import { useAccionesDeQueFalta, type AccionesDeQueFalta } from '../hooks/use-acciones-de-que-falta'
import { FueraDeRegla } from './fuera-de-regla'
import { PedirloDeQueFalta } from './pedirlo-de-que-falta'
import { RequisitosDeUnDestino } from './requisitos-de-un-destino'

type Props = {
  unidad: UnidadAbierta
  dato: QueFalta
  actualizando: boolean
  releer: () => void
}

// Un destino en la ficha: «Para pasar a «<destino>»» y lo que esa fase pide, con sus botones; si ya no falta nada, lo dice en una línea. Si su vista previa
// no se pudo leer, lo dice aquí sin tumbar a los demás.
function DestinoDeLaFicha({
  destino,
  acciones,
  releer,
}: {
  destino: DestinoConVista
  acciones: AccionesDeQueFalta
  releer: () => void
}) {
  const listo = destino.vista?.requisitos.every((r) => r.cumplido) ?? false
  return (
    <li className="grid gap-2" data-destino={destino.faseId}>
      <h3 className="flex min-w-0 items-center gap-2 text-(length:--text-sm) font-semibold break-words text-(--color-ink)">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: destino.color }}
        />
        Para pasar a «{destino.nombre}»
      </h3>
      {destino.vista === null ? (
        <Aviso tono="peligro">
          <p>{destino.errorDeLaVista}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 min-h-11 md:min-h-8"
            onClick={releer}
          >
            Reintentar
          </Button>
        </Aviso>
      ) : listo ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Listo para pasar a «{destino.nombre}».
        </p>
      ) : (
        <RequisitosDeUnDestino requisitos={destino.vista.requisitos} acciones={acciones} />
      )}
    </li>
  )
}

// Lo que dibuja «Qué falta» en la ficha con la lectura lista: cuánto lleva en la fase, si está fuera de regla y lo que pide cada destino. Sin «La ganamos»
// (está en el aviso de situación, arriba) ni «Elegir» (mover es de logística).
export function CuerpoDeQueFaltaDeLaFicha({ unidad, dato, actualizando, releer }: Props) {
  const acciones = useAccionesDeQueFalta(unidad, dato.acciones, true)
  const dias = dato.faseActualId === null ? null : textoDeDiasEnLaFase(unidad.faseDesde)
  return (
    <div className="grid gap-3" data-hueco="que-falta-de-la-ficha" data-estado="listo">
      {dias ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{dias}</p> : null}
      <p
        id={acciones.idSinConexion}
        aria-live="polite"
        className="text-(length:--text-sm) text-(--color-ink-faint) empty:hidden"
      >
        {acciones.enLinea ? (actualizando ? 'Actualizando…' : '') : SIN_CONEXION_EN_QUE_FALTA}
      </p>
      {dato.faseActualId === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_FASE}</p>
      ) : null}
      {dato.fueraDeRegla.length > 0 ? <FueraDeRegla faltan={dato.fueraDeRegla} /> : null}
      {dato.destinos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_DESTINOS}</p>
      ) : (
        <ul className="grid gap-4">
          {dato.destinos.map((destino) => (
            <DestinoDeLaFicha
              key={destino.faseId}
              destino={destino}
              acciones={acciones}
              releer={releer}
            />
          ))}
        </ul>
      )}
      {dato.hayMasDestinos ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{HAY_MAS_DESTINOS}</p>
      ) : null}
      {unidad.tipo === 'vehiculo' ? (
        <PedirloDeQueFalta vehiculoId={unidad.id} acciones={dato.acciones} />
      ) : null}
    </div>
  )
}
