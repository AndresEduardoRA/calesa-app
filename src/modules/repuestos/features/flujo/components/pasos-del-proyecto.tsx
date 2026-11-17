'use client'

import { ChevronRightIcon } from 'lucide-react'
import { Fragment, useMemo, useRef } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import {
  armarPasos,
  panelesFueraDeLosPasos,
  type IndiceDelFlujo,
} from '../../../entities/flujo/pasos'
import type { LecturaDeLosPasos, PanelDelPaso } from '../../../entities/flujo/pasos-del-flujo'
import { BotonDelPanelDelPaso } from './boton-del-panel-del-paso'
import { EstadoDeLosPasos } from './estado-de-los-pasos'
import { TarjetaDelPaso } from './tarjeta-del-paso'

type Props = {
  indice: IndiceDelFlujo | null
  estado: LecturaDeLosPasos['estado']
  // Las filas vivas de la hoja: un precio tecleado cambia el progreso sin releer nada.
  filas: readonly Pick<FilaDeItem, 'fase' | 'precioCliente'>[]
  hayMas: boolean
  // Si hay un pago vivo; nulo sin `repuestos.costos.ver`.
  pago: boolean | null
  // Los paneles que quien mira puede abrir y el abierto.
  disponibles: readonly PanelDelPaso[]
  abierto: PanelDelPaso | null
  alElegirPanel: (panel: PanelDelPaso | null) => void
  puedeConfigurar: boolean
  alReintentar: () => void
}

function FilaDePasos(props: Props & { indice: IndiceDelFlujo }) {
  const { indice, filas, hayMas, pago } = props
  const lista = useRef<HTMLOListElement>(null)
  const desborde = useDesborde(lista)
  const pasos = useMemo(
    () => armarPasos(indice, filas, { hayMas, pago }),
    [indice, filas, hayMas, pago],
  )
  const conProgreso = filas.length > 0
  return (
    <>
      {conProgreso ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Agrega ítems para ver cuántos van en cada paso.
        </p>
      )}
      <div className="relative min-w-0">
        <ol ref={lista} className="flex min-w-0 items-stretch gap-1 overflow-x-auto pb-1">
          {pasos.map((paso, i) => (
            <Fragment key={paso.tipo === 'fase' ? paso.fase.id : paso.hito}>
              {i > 0 ? (
                <li aria-hidden className="flex shrink-0 items-center text-(--color-ink-faint)">
                  <ChevronRightIcon className="size-4" />
                </li>
              ) : null}
              <TarjetaDelPaso
                paso={paso}
                conProgreso={conProgreso}
                disponibles={props.disponibles}
                abierto={props.abierto}
                alElegirPanel={props.alElegirPanel}
              />
            </Fragment>
          ))}
        </ol>
        <PistaDeDesborde {...desborde} />
      </div>
    </>
  )
}

// Los pasos del proyecto (`docs/GLOSARIO.md` › «Paso (de un proyecto)»), sobre la hoja: las fases activas del flujo de repuestos y sus hitos, con cuántos ítems llegaron
// a cada uno; al final, «Del proyecto» con los paneles que el flujo no ubica en un paso (Compras siempre). La fila se desplaza de costado (`min-w-0`, `PistaDeDesborde`) y
// el grupo se parte con `flex-wrap`. La URL es de quien la usa (`alElegirPanel`).
export function PasosDelProyecto(props: Props) {
  const { indice, estado, disponibles } = props
  const sueltos = panelesFueraDeLosPasos(indice).filter((p) => disponibles.includes(p))
  return (
    <section
      aria-labelledby="pasos-del-proyecto"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2"
      data-pasos-del-proyecto=""
    >
      <h2 id="pasos-del-proyecto" className="text-(length:--text-base) font-semibold">
        Pasos del proyecto
      </h2>
      {estado === 'listo' ? null : (
        <EstadoDeLosPasos
          estado={estado}
          puedeConfigurar={props.puedeConfigurar}
          alReintentar={props.alReintentar}
        />
      )}
      {indice === null ? null : <FilaDePasos {...props} indice={indice} />}
      {sueltos.length > 0 ? (
        <div
          role="group"
          aria-labelledby="pasos-del-proyecto-sueltos"
          className="flex flex-wrap items-center gap-2"
        >
          <span
            id="pasos-del-proyecto-sueltos"
            className="text-(length:--text-sm) text-(--color-ink-soft)"
          >
            Del proyecto
          </span>
          {sueltos.map((panel) => (
            <BotonDelPanelDelPaso
              key={panel}
              panel={panel}
              abierto={props.abierto}
              alElegir={props.alElegirPanel}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
