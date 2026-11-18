'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useEffectEvent, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoError } from '@/shared/ui/estados'
import {
  hayOtras,
  motivoParaNoAprobarEsta,
  type AprobarEn,
} from '../../../../entities/aprobada/de-este-vehiculo'
import {
  alternar,
  casillaApagada,
  elegidasEnLaLista,
} from '../../../../entities/aprobada/eleccion-para-comparar'
import { rutaDelListado } from '../../../../entities/ruta-de-la-hoja'
import { useAlCambiarLaAprobada } from '../../hooks/aprobada-del-vehiculo'
import { useAprobarEsta } from '../../hooks/use-aprobar-esta'
import { useDeEsteVehiculo, type DeEsteVehiculoLeido } from '../../hooks/use-de-este-vehiculo'
import { useFocoAlLlegar } from '../../hooks/use-foco-al-llegar'
import { ID_DE_ESTE_VEHICULO } from './ancla'
import { BotonComparar } from './boton-comparar'
import { CasillaDeComparar } from './casilla-de-comparar'
import { EsqueletoDeEsteVehiculo } from './esqueleto-de-este-vehiculo'
import { FilaDeEsteVehiculo } from './fila-de-este-vehiculo'

export type PropsDeEsteVehiculo = {
  vehiculo: { id: string; titulo: string | null }
  // La cotización que se está mirando (la guardada o la del resumen): va marcada «Esta». Sin ella (la ficha del vehículo), ninguna lo es.
  cotizacionActual?: string
  aprobarEn: AprobarEn
  // Las casillas de comparar y «Comparar» en la fila del título, que lleva a «Comparar cotizaciones» con `returnTo` = `volverA`.
  conCasillas?: boolean
  volverA?: string
  // El id del lugar junto al título del servidor (el h2 de la guardada, al que salta el «Ver» de la línea) donde va «Comparar»: la isla lo pone ahí con un portal y
  // el título nunca se vuelve a montar. Sin él, «Comparar» va en la fila del título propio.
  ranuraDeComparar?: string
  // Tras aprobar o deshacer desde el bloque (el resumen refresca el listado).
  alCambiar?: () => void
  // Dibuja su propio título: el resumen no tiene el del servidor.
  conTitulo?: boolean
}

// «De este vehículo»: las cotizaciones del vehículo que quien mira ve, la aprobada primero y marcada, «Esta» la que se mira y «Aprobar esta» en cada una (la aprobada
// no lo lleva). De a 10 con «Ver más» hasta 100 y, ahí, «Ver todas en Cotizaciones». Se lee al montarse desde el navegador; tras aprobar o deshacer relee la primera
// página y avisa a las otras islas del vehículo (la cabecera de la guardada). Nunca refresca la guardada (perdería lo tipeado). Sin otras, no dibuja nada.
export function DeEsteVehiculo({
  vehiculo,
  cotizacionActual,
  aprobarEn,
  alCambiar,
  conTitulo = false,
  conCasillas = false,
  volverA,
  ranuraDeComparar,
}: PropsDeEsteVehiculo) {
  const lista = useDeEsteVehiculo(vehiculo.id)
  const fuente = useId()
  const idDelTitulo = useId()
  const idDelAviso = useId()
  // Las marcadas; las que se ven elegidas son las que siguen en la lista (tras aprobar o releer se sueltan las que ya no están).
  const [marcadas, setMarcadas] = useState<readonly string[]>([])
  const ranura = useRanura(ranuraDeComparar)
  const elegidas = elegidasEnLaLista(marcadas, lista.aLaVista)
  const leerAlMontar = useEffectEvent(lista.leerLaPrimera)
  useEffect(() => {
    leerAlMontar()
  }, [])
  // El «Ver» de la línea salta al título del servidor; el resumen dibuja el suyo y no escucha.
  useFocoAlLlegar(ID_DE_ESTE_VEHICULO, !conTitulo)
  useAlCambiarLaAprobada(vehiculo.id, fuente, lista.releer)
  const { enCurso, aprobar } = useAprobarEsta(vehiculo.id, fuente, () => {
    lista.releer()
    alCambiar?.()
  })

  if (!lista.leido) {
    return <SinLeer lista={lista} />
  }
  if (!hayOtras(lista.aLaVista, cotizacionActual)) {
    return null
  }
  const comparar = conCasillas ? (
    <BotonComparar elegidas={elegidas} volverA={volverA} idDelAviso={idDelAviso} />
  ) : null
  return (
    <section
      aria-labelledby={conTitulo ? idDelTitulo : undefined}
      aria-label={conTitulo ? undefined : 'De este vehículo'}
      className="@container/de-este grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2"
    >
      <FilaDelTitulo conTitulo={conTitulo} idDelTitulo={idDelTitulo}>
        {comparar !== null && ranura === null ? comparar : null}
      </FilaDelTitulo>
      {comparar !== null && ranura !== null ? createPortal(comparar, ranura) : null}
      <ul
        aria-label="Cotizaciones de este vehículo"
        className="grid grid-cols-[minmax(0,1fr)] gap-2"
      >
        {lista.aLaVista.map((fila) => (
          <FilaDeEsteVehiculo
            key={fila.id}
            fila={fila}
            tituloDelVehiculo={vehiculo.titulo}
            esta={fila.id === cotizacionActual}
            motivo={motivoParaNoAprobarEsta(fila, aprobarEn)}
            aprobando={enCurso === fila.id}
            // Un envío a la vez, y nada mientras se relee: la versión de la fila podría estar vieja.
            ocupado={enCurso !== null || lista.cargando}
            alAprobar={() => {
              aprobar(fila)
            }}
            casilla={
              conCasillas ? (
                <Casilla
                  fila={fila}
                  elegidas={elegidas}
                  idDelAviso={idDelAviso}
                  alElegir={setMarcadas}
                />
              ) : null
            }
          />
        ))}
      </ul>
      <Pie lista={lista} vehiculoId={vehiculo.id} />
    </section>
  )
}

// El lugar del servidor donde va «Comparar», leído una vez al montarse: la isla sólo se dibuja en el navegador (`diferido()`) y la ranura ya está en el documento.
function useRanura(id: string | undefined): HTMLElement | null {
  const [ranura] = useState(() => (id === undefined ? null : document.getElementById(id)))
  return ranura
}

// La fila del título propio (el resumen) con «Comparar» a la derecha. Sin ninguno de los dos, nada.
function FilaDelTitulo({
  conTitulo,
  idDelTitulo,
  children,
}: {
  conTitulo: boolean
  idDelTitulo: string
  children: ReactNode
}) {
  if (!conTitulo && children === null) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {conTitulo ? (
        <h3 id={idDelTitulo} className="font-semibold text-(--color-ink)">
          De este vehículo
        </h3>
      ) : null}
      {children}
    </div>
  )
}

// Antes de la primera página: el esqueleto, o el error con «Reintentar».
function SinLeer({ lista }: { lista: DeEsteVehiculoLeido }) {
  return (
    <>
      {lista.error ? (
        <div role="alert">
          <EstadoError
            titulo="No pudimos cargar las cotizaciones de este vehículo."
            alReintentar={lista.reintentar}
            compacto
          />
        </div>
      ) : (
        <EsqueletoDeEsteVehiculo />
      )}
    </>
  )
}

function Casilla({
  fila,
  elegidas,
  idDelAviso,
  alElegir,
}: {
  fila: { id: string; numero: number }
  elegidas: readonly string[]
  idDelAviso: string
  alElegir: (elegidas: readonly string[]) => void
}) {
  return (
    <CasillaDeComparar
      numero={fila.numero}
      elegida={elegidas.includes(fila.id)}
      apagada={casillaApagada(elegidas, fila.id)}
      idDelAviso={idDelAviso}
      alAlternar={() => {
        alElegir(alternar(elegidas, fila.id))
      }}
    />
  )
}

// Lo que va debajo de las filas: el error de «Ver más», el tope con su camino al listado, o «Ver más».
function Pie({ lista, vehiculoId }: { lista: DeEsteVehiculoLeido; vehiculoId: string }) {
  const boton = buttonVariants({
    variant: 'outline',
    className: 'min-h-11 w-full md:min-h-9 md:w-auto md:justify-self-start',
  })
  if (lista.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No se pudieron cargar más.
        </p>
        <button type="button" className={boton} onClick={lista.reintentar}>
          Reintentar
        </button>
      </div>
    )
  }
  if (lista.enElTope) {
    return (
      <AvisoDeTope
        texto={textoDelTope(TOPE_DE_ESTE_VEHICULO, { articulo: 'las' })}
        camino={
          <Link
            href={rutaDelListado({ vehiculo: vehiculoId }) as Route}
            className="underline hover:text-(--color-ink)"
          >
            Ver todas en Cotizaciones
          </Link>
        }
      />
    )
  }
  return lista.hayMasParaPedir ? (
    <button type="button" className={boton} disabled={lista.cargando} onClick={lista.verMas}>
      {lista.cargando ? 'Cargando…' : 'Ver más'}
    </button>
  ) : null
}
