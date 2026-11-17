'use client'

import { SlidersHorizontalIcon } from 'lucide-react'
import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { cn } from 'cn'
import { CORTE_DEL_PANEL } from '@/shared/lib/ancho'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { useAlMenos } from '../ancho-de-pantalla'
import { Button } from '../button'
import { Drawer } from '../drawer'
import { ChipsDeFiltros } from './chips-de-filtros'
import { ContextoDeFiltros } from './contexto'
import { CampoDeBusqueda } from './controles-de-texto'
import { PanelDeFiltros } from './panel-de-filtros'
import { ordenarConPorPagina } from '../vista-y-opciones/grupos'
import type { GrupoDeVistaYOpciones } from '../vista-y-opciones/tipos'
import { VistaYOpciones } from '../vista-y-opciones/vista-y-opciones'
import {
  AvisosDePorPagina,
  SelectorDePorPagina,
  type PorPaginaDeLaLista,
} from './selector-de-por-pagina'
import { useFiltros } from './use-filtros'
import { usePanelAlCostado } from './use-panel-al-costado'
import { usePorPaginaDelListado, type PorPaginaDelListado } from './use-por-pagina-del-listado'

// El panel de filtros entra al costado si el contenedor del listado mide 40 rem o más (`REM_PARA_EL_PANEL_AL_COSTADO`); si no, en una hoja
// inferior. Antes el corte era `lg` (1.024 px de pantalla): con el texto al 200 % los 15 rem del panel son 480 px y dejaban 176 a la lista
//. Hasta que se mide, vale lo que supuso el servidor por el ancho de la petición (antes, una pintura de escritorio podía abrir la hoja
// un instante) y después el contenedor de verdad.
function usePanelAlLado(contenedor: RefObject<HTMLElement | null>): boolean {
  return usePanelAlCostado(contenedor, useAlMenos(CORTE_DEL_PANEL))
}

// Abre el panel (o lo pliega, en escritorio) y dice cuántos filtros hay puestos.
function BotonDeFiltros(props: { cantidad: number; abierto: boolean; alPulsar: () => void }) {
  return (
    <Button
      variant="outline"
      className="h-11 md:h-9"
      aria-expanded={props.abierto}
      onClick={props.alPulsar}
    >
      <SlidersHorizontalIcon aria-hidden />
      Filtros
      {props.cantidad > 0 ? (
        <span className="rounded-full bg-(--color-primario) px-1.5 text-(length:--text-xs) text-(--color-sobre-primario) tabular-nums">
          {props.cantidad}
        </span>
      ) : null}
    </Button>
  )
}

// En el celular el panel va en una hoja inferior (`?panel=filtros`), con «Limpiar» y «Ver resultados».
function HojaDeFiltros(props: {
  abierta: boolean
  hayFiltros: boolean
  alLimpiar: () => void
  alCerrar: () => void
  children: ReactNode
}) {
  return (
    <Drawer
      lado="bottom"
      titulo="Filtros"
      abierto={props.abierta}
      alCerrar={props.alCerrar}
      pie={
        <div className="flex w-full justify-between gap-2">
          <Button variant="ghost" onClick={props.alLimpiar} disabled={!props.hayFiltros}>
            Limpiar
          </Button>
          <Button onClick={props.alCerrar}>Ver resultados</Button>
        </div>
      }
    >
      {props.children}
    </Drawer>
  )
}

// La lista y, a su lado desde 40 rem de contenedor, el panel de filtros (el panel de la hoja del celular es otro, aparte). Mientras llega
// una lista filtrada, la anterior se atenúa.
function CuerpoDeLaLista(props: {
  conPanel: boolean
  panel: ReactNode
  pendiente: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'grid items-start gap-4',
        props.conPanel && '@min-[40rem]:grid-cols-[15rem_minmax(0,1fr)]',
      )}
    >
      {props.conPanel ? (
        <aside
          aria-label="Filtros"
          className="hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 @min-[40rem]:block"
        >
          {props.panel}
        </aside>
      ) : null}
      <div
        aria-busy={props.pendiente}
        className={cn(
          'min-w-0 transition-opacity duration-(--dur-rapida)',
          props.pendiente && 'opacity-60',
        )}
      >
        {props.children}
      </div>
    </div>
  )
}

// El grupo «Ítems por página» de «Vista y opciones». Sigue sin red: lo elegido queda pendiente y sale solo al volver.
function grupoDePorPagina(
  porPagina: PorPaginaDeLaLista | undefined,
  estado: PorPaginaDelListado,
): GrupoDeVistaYOpciones | null {
  if (!porPagina) {
    return null
  }
  return {
    clave: 'por-pagina',
    titulo: 'Ítems por página',
    resumen: `${estado.visto} por página`,
    sinRed: 'sigue',
    contenido: (
      <SelectorDePorPagina
        opciones={porPagina.opciones}
        estado={estado}
        etiquetaOculta
        className="justify-items-start"
      />
    ),
  }
}

type Props = {
  esquema: EsquemaDeFiltros
  // Los grupos de «Vista y opciones» (vista, alcance, vistas guardadas, «Más»…), ya filtrados por permisos. Sin ellos ni `porPagina`, no hay botón.
  opciones?: readonly GrupoDeVistaYOpciones[]
  // Al final de la barra: «Nuevo». Lo que no se usa a cada rato va en `opciones`.
  acciones?: ReactNode
  // Al pie del panel de filtros.
  pieDelPanel?: ReactNode
  // Al pie de una sección del panel (por su clave).
  accionesDeSeccion?: Readonly<Record<string, ReactNode>>
  // «Ítems por página» de este listado: lo que dibuja la página y los tamaños que ofrece (hasta su máximo). Sin esto, el
  // listado no lo ofrece. Va en «Vista y opciones»; su estado vive acá, así lo elegido sin red sale solo con el panel cerrado.
  porPagina?: PorPaginaDeLaLista
  // La lista. Adentro puede usar `useFiltrosDelListado()`.
  children: ReactNode
}

// El armazón de un listado con filtros: búsqueda (ocupa el ancho libre), botón «Filtros», «Vista y opciones», «Nuevo», chips de lo que
// está activo y «Limpiar»; el panel al costado en escritorio (plegable) y en una hoja inferior en el celular.
// Todo el estado vive en la URL. No sabe de ningún módulo: cada listado le pasa su esquema y sus opciones.
export function FilterShell(props: Props) {
  const {
    esquema,
    opciones = [],
    acciones,
    pieDelPanel,
    accionesDeSeccion,
    porPagina,
    children,
  } = props
  const filtros = useFiltros(esquema)
  const raiz = useRef<HTMLDivElement>(null)
  const alLado = usePanelAlLado(raiz)
  const porPaginaEstado = usePorPaginaDelListado(porPagina?.valor ?? 0, filtros.aplicarPorPagina)
  const grupos = ordenarConPorPagina(opciones, grupoDePorPagina(porPagina, porPaginaEstado))
  const [opcionesAbiertas, setOpcionesAbiertas] = useState(false)
  const [plegado, setPlegado] = useState(false)
  const hayPanel = esquema.filtros.length > 0 || pieDelPanel !== undefined
  const panel = (
    <PanelDeFiltros
      filtros={esquema.filtros}
      secciones={esquema.secciones}
      accionesDeSeccion={accionesDeSeccion}
      pie={pieDelPanel}
    />
  )

  return (
    <ContextoDeFiltros value={filtros}>
      {/* Columna `minmax(0, 1fr)`: con una `auto` el texto sin cortar de un chip (una búsqueda de 22 letras, 403 px) fija el mínimo de la grilla y
          ensancha la página al 200 % (5a-23). */}
      <div ref={raiz} className="@container grid grid-cols-[minmax(0,1fr)] gap-3">
        <div data-barra-de-filtros className="flex flex-wrap items-center gap-2">
          {esquema.busqueda ? (
            <CampoDeBusqueda
              etiqueta={esquema.busqueda.etiqueta}
              marcador={esquema.busqueda.marcador}
              minimo={esquema.busqueda.minimo}
              valor={filtros.valores.busqueda}
              alBuscar={filtros.buscar}
            />
          ) : null}
          {hayPanel ? (
            <BotonDeFiltros
              cantidad={Object.keys(filtros.valores.porClave).length}
              abierto={alLado ? !plegado : filtros.panelAbierto}
              alPulsar={() => {
                if (alLado) {
                  setPlegado((antes) => !antes)
                } else {
                  filtros.abrirPanel()
                }
              }}
            />
          ) : null}
          {/* Una barra plana: cada pieza envuelve por su cuenta, a la izquierda y en el orden en que se leen; el buscador crece y llena el
              resto de la fila. */}
          <VistaYOpciones grupos={grupos} alCambiarAbierto={setOpcionesAbiertas} />
          {acciones}
        </div>
        {opcionesAbiertas || !porPagina ? null : <AvisosDePorPagina estado={porPaginaEstado} />}
        <ChipsDeFiltros esquema={esquema} />
        <CuerpoDeLaLista
          conPanel={hayPanel && !plegado}
          panel={panel}
          pendiente={filtros.pendiente}
        >
          {children}
        </CuerpoDeLaLista>
      </div>
      <HojaDeFiltros
        abierta={filtros.panelAbierto && !alLado}
        hayFiltros={filtros.hayFiltros}
        alLimpiar={filtros.limpiar}
        alCerrar={filtros.cerrarPanel}
      >
        {panel}
      </HojaDeFiltros>
    </ContextoDeFiltros>
  )
}
