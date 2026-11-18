'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { use } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  faltaUnDato,
  pasosDeLaHoja,
  type EleccionDelPaso,
  type PasoDeLaHoja,
} from '../../../entities/pasos-de-la-hoja'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import {
  AJUSTE_DE_CABECERA,
  AJUSTE_DE_CELDA,
  CLAVE_DE_AJUSTE,
  CLAVE_DE_AYUDA,
  CLAVE_DEL_NODO,
  PANEL_DE_VISTA_PREVIA,
} from '../hooks/urls-de-la-hoja'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'

// Lo que la página sabe de los paneles que se eligen: el del vehículo y el del cliente (nulo: ese paso no va).
export type PasosDeLaPagina = { vehiculo: EleccionDelPaso; cliente: EleccionDelPaso }

// El botón: 44 px en el celular (32 con puntero fino desde `md`), todo su lugar en la rejilla; el punto es un `::before` del color de su estado, con su texto aparte.
const BOTON =
  "flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 text-(length:--text-sm) font-medium text-(--color-ink) transition hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none md:pointer-fine:min-h-8 data-[punto]:before:size-2 data-[punto]:before:shrink-0 data-[punto]:before:rounded-full data-[punto]:before:content-[''] data-[punto=elegido]:before:bg-(--color-positivo) data-[punto=obligatorio-que-falta]:before:bg-(--color-peligro) data-[punto=falta-un-dato]:before:bg-(--color-aviso)"

// El nombre del botón es lo que se ve («Vehículo»); el punto lo dice su descripción (un texto `hidden` adentro, que `aria-describedby` sí lee) y su `title`
// («Vehículo: elegido»). Va en `data-punto` con guiones (Tailwind lee un `_` de un valor arbitrario como un espacio). **Fuera del orden de Tab** (`tabIndex -1`): la
// tarea de oro «cotizar» no suma paradas, y con el teclado lo mismo se alcanza por las barras del vehículo y del cliente, «Vista previa» del resumen y las celdas.
const marcas = (paso: PasoDeLaHoja) => ({
  'data-paso': paso.clave,
  ...(paso.punto === null
    ? {}
    : { 'data-punto': paso.punto.replaceAll('_', '-'), 'aria-describedby': `paso-${paso.clave}` }),
  title: paso.title,
  tabIndex: -1,
})

function Contenido({ paso }: { paso: PasoDeLaHoja }) {
  return (
    <>
      {paso.etiqueta}
      {paso.textoDelPunto === null ? null : (
        <span id={`paso-${paso.clave}`} hidden>
          {paso.textoDelPunto}
        </span>
      )}
    </>
  )
}

// «Hoja»: cierra lo que la hoja tenga abierto (un panel, una ayuda, un ⚙) y, en el cuadro siguiente, pone el foco en la primera celda que se edita.
function PasoDeLaHojaMisma({ paso }: { paso: PasoDeLaHoja }) {
  const [url, escribir] = useQueryStates({
    panel: parseAsString,
    [CLAVE_DE_AYUDA]: parseAsString,
    [CLAVE_DE_AJUSTE]: parseAsString,
    [CLAVE_DEL_NODO]: parseAsString,
  })
  return (
    <button
      type="button"
      className={BOTON}
      {...marcas(paso)}
      onClick={() => {
        const ajuste = url[CLAVE_DE_AJUSTE]
        void escribir({
          panel: null,
          [CLAVE_DE_AYUDA]: null,
          [CLAVE_DE_AJUSTE]:
            ajuste === AJUSTE_DE_CELDA || ajuste === AJUSTE_DE_CABECERA ? null : ajuste,
          [CLAVE_DEL_NODO]: null,
        })
        requestAnimationFrame(() => {
          const celdas = document.querySelectorAll<HTMLElement>('[data-hoja] [data-parada="0"]')
          ;[...celdas]
            .find((c) => !c.hasAttribute('disabled') && c.ariaDisabled !== 'true')
            ?.focus()
        })
      }}
    >
      <Contenido paso={paso} />
    </button>
  )
}

// Un paso que abre su panel de hoy por la URL (`?panel=vehiculo`, `?panel=cliente`, `?panel=vista-previa`).
function PasoDeUnPanel({ paso, panel }: { paso: PasoDeLaHoja; panel: string }) {
  const abrir = usePanelPorUrl(panel).abrir
  return (
    <button
      type="button"
      className={BOTON}
      {...marcas(paso)}
      onClick={() => {
        abrir()
      }}
    >
      <Contenido paso={paso} />
    </button>
  )
}

// Los pasos de la hoja (docs/GLOSARIO.md › «Pasos de la hoja»): «Hoja · Vehículo · Cliente · Vista previa», como en V1, debajo de los modos y arriba de las secciones. Se
// reparten el ancho en partes iguales; la pista mínima va en rem, así al 200 % pasan a dos filas sin desbordar. Las barras del vehículo y del cliente se quedan: los
// pasos son la navegación, las barras muestran lo elegido.
export function PasosDeLaHoja({
  pasos,
  respuesta,
}: {
  pasos: PasosDeLaPagina
  respuesta: RespuestaDeRecalculo | null
}) {
  const conVistaPrevia = use(ContextoDeLaVistaPrevia) !== null
  const lista = pasosDeLaHoja({
    faltaUnDato: faltaUnDato(respuesta),
    vehiculo: pasos.vehiculo,
    cliente: pasos.cliente,
    vistaPrevia: conVistaPrevia ? PANEL_DE_VISTA_PREVIA : null,
  })
  return (
    <nav
      aria-label="Pasos de la hoja"
      data-pasos-de-la-hoja=""
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2"
    >
      {lista.map((paso) =>
        paso.panel === null ? (
          <PasoDeLaHojaMisma key={paso.clave} paso={paso} />
        ) : (
          <PasoDeUnPanel key={paso.clave} paso={paso} panel={paso.panel} />
        ),
      )}
    </nav>
  )
}
