'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { Skeleton } from '@/shared/ui/skeleton'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  MENSAJE_DE_COTIZACION_NO_DISPONIBLE,
  rutaDelResumen,
  vistaDelResumen,
  type LecturaDelServidor,
  type VistaDelResumen,
} from '../../../entities/listado/resumen-del-listado'
import type {
  AprobarEnDelResumen,
  HuecosDelResumen,
  QuienDelResumen,
} from '../../hoja/components/huecos-del-resumen'
import { usePedidoAlServidor } from '../hooks/use-pedido-al-servidor'
import { useResumenDeCotizacion } from '../hooks/use-resumen-de-cotizacion'
import { AccionesDelResumen } from './acciones-del-resumen'
import { DatosDelResumen } from './datos-del-resumen'
import {
  nombreDelOrigen,
  type CompartirDe,
  type FilaDeCotizacion,
  type MenuDeFila,
  type OrigenDelListado,
} from './tipos'

type Props = {
  // Las filas de la página: de ahí sale lo que se ve de inmediato.
  filas: readonly FilaDeCotizacion[]
  origenes: readonly OrigenDelListado[]
  // Lo que el servidor leyó de la cotización de la URL cuando no está en la página.
  delServidor: LecturaDelServidor | null
  // Lo que las áreas llenan bajo el detalle (las pestañas) y lo que quien mira puede hacer con cada cotización (por id). Sin ellos, el resumen es sólo lo que trae la fila.
  huecos?: HuecosDelResumen
  quienes?: Readonly<Record<string, QuienDelResumen>>
  // Dónde aprueba quien mira (para «De este vehículo»; sin él, «Aprobar esta» apagado con su motivo) y qué hacer tras aprobar desde el resumen.
  aprobarEn?: AprobarEnDelResumen
  alCambiarLaAprobada?: () => void
  // La barra de arriba: el «⋯» de la fila (sin «Compartir») y «Compartir» de la tarjeta, los mismos del listado. Sin ellos, sólo «Abrir cotización».
  menuDeFila?: MenuDeFila | undefined
  compartirDe?: CompartirDe | undefined
  // Los diálogos del «⋯» y de «Compartir» mientras el resumen está abierto: dentro del Drawer, para que abrirlos no cuente como un clic afuera que lo cierra.
  dialogos?: ReactNode
}

// Lo que dibuja la barra de arriba del resumen.
type BarraDelResumen = {
  menuDeFila: MenuDeFila | undefined
  compartirDe: CompartirDe | undefined
}

// Lo que el resumen le pasa a «De este vehículo».
type DeEsteVehiculoEnElDetalle = {
  aprobarEn: AprobarEnDelResumen
  alCambiarLaAprobada: (() => void) | undefined
}

function EsqueletoDelResumen() {
  return (
    <div aria-busy="true" aria-label="Cargando la cotización" className="grid gap-2">
      <Skeleton className="mb-2 h-11 w-full md:h-9" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

function DetalleDeLaCotizacion({
  cotizacion,
  abierto,
  huecos,
  quien,
  deEsteVehiculo,
  barra,
}: {
  cotizacion: FilaDeCotizacion
  abierto: boolean
  huecos: HuecosDelResumen
  quien: QuienDelResumen
  deEsteVehiculo: DeEsteVehiculoEnElDetalle
  barra: BarraDelResumen
}) {
  const { Portada, Pestanas, Comprobantes, DeEsteVehiculo } = huecos
  return (
    <div className="grid gap-4">
      <AccionesDelResumen
        cotizacionId={cotizacion.id}
        compartir={barra.compartirDe?.(cotizacion) ?? null}
        menu={barra.menuDeFila?.(cotizacion, { sinCompartir: true, conBorde: true }) ?? null}
      />
      {Portada === undefined ? null : (
        <Portada
          key={cotizacion.id}
          cotizacionId={cotizacion.id}
          numero={cotizacion.numero}
          total={{ valor: cotizacion.totalBase }}
        />
      )}
      <DatosDelResumen cotizacion={cotizacion} />
      {DeEsteVehiculo !== undefined &&
      abierto &&
      cotizacion.vehiculoId !== null &&
      cotizacion.vehiculo !== null ? (
        <DeEsteVehiculo
          key={cotizacion.id}
          vehiculo={{ id: cotizacion.vehiculoId, titulo: cotizacion.vehiculo }}
          cotizacionActual={cotizacion.id}
          aprobarEn={deEsteVehiculo.aprobarEn}
          alCambiar={deEsteVehiculo.alCambiarLaAprobada}
          conTitulo
          conCasillas
          volverA={rutaDelResumen(cotizacion.id)}
        />
      ) : null}
      {Pestanas === undefined ? null : (
        <Pestanas
          cotizacion={{ id: cotizacion.id, numero: cotizacion.numero, clase: cotizacion.clase }}
          puedeAdjuntar={quien.puedeAdjuntar}
          puedeModerar={quien.puedeModerar}
          abierto={abierto}
          Comprobantes={Comprobantes}
        />
      )}
    </div>
  )
}

// Quien mira sin lo que el servidor calculó (una cotización que no estaba en la página ni la leyó): nada de adjuntar ni de moderar, que es lo conservador.
const SIN_PERMISOS: QuienDelResumen = { puedeAdjuntar: false, puedeModerar: false }
// Sin saber dónde aprueba quien mira, en ningún origen: «Aprobar esta» apagado con su motivo (la base vuelve a decidir al aprobar).
const SIN_DONDE_APROBAR: AprobarEnDelResumen = []

function ContenidoDelResumen({
  vista,
  ultimo,
  reintentar,
  huecos,
  quienes,
  deEsteVehiculo,
  barra,
}: {
  vista: VistaDelResumen
  ultimo: FilaDeCotizacion | null
  reintentar: () => void
  huecos: HuecosDelResumen
  quienes: Readonly<Record<string, QuienDelResumen>>
  deEsteVehiculo: DeEsteVehiculoEnElDetalle
  barra: BarraDelResumen
}) {
  if (vista.tipo === 'no_disponible') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink)">
        {MENSAJE_DE_COTIZACION_NO_DISPONIBLE}
      </p>
    )
  }
  if (vista.tipo === 'error') {
    return (
      <div role="alert" className="grid gap-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudo cargar la cotización.
        </p>
        <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
          Reintentar
        </Button>
      </div>
    )
  }
  // La última que se mostró sólo mientras se cierra (`vista` es `cerrado`).
  const cotizacion =
    vista.tipo === 'cotizacion' ? vista.cotizacion : vista.tipo === 'cerrado' ? ultimo : null
  return cotizacion === null ? (
    <EsqueletoDelResumen />
  ) : (
    <DetalleDeLaCotizacion
      cotizacion={cotizacion}
      abierto={vista.tipo === 'cotizacion'}
      huecos={huecos}
      quien={quienes[cotizacion.id] ?? SIN_PERMISOS}
      deEsteVehiculo={deEsteVehiculo}
      barra={barra}
    />
  )
}

// El resumen de una cotización (`?cotizacion=`) sin salir del listado, en un panel ancho. Arriba, «Abrir cotización» (a su página), «Compartir cotización» y el «⋯» de
// la fila sin «Compartir» (`menuDeFila`, `compartirDe`: los del listado); debajo, la portada, los datos de la fila, «De este vehículo» y las pestañas «Todo», «Adjuntos»,
// «Revisiones» y «Comentarios» que llenan las áreas (`huecos`). Si la cotización no está en la página, la leyó el servidor (`delServidor`); si tampoco, se le pide una vez
// (`router.refresh()`) y, si no llega, dice «error» con «Reintentar». Una que no existe o que quien mira no ve dice lo mismo, sin explicar por qué y sin la barra.
export function ResumenDeCotizacion({
  filas,
  origenes,
  delServidor,
  huecos,
  quienes,
  aprobarEn,
  alCambiarLaAprobada,
  menuDeFila,
  compartirDe,
  dialogos,
}: Props) {
  const resumen = useResumenDeCotizacion()
  const base = vistaDelResumen({ texto: resumen.texto, filas, delServidor, yaPedido: false })
  const pedido = usePedidoAlServidor(resumen.id, base.tipo === 'cargando')
  const vistaPedida = vistaDelResumen({
    texto: resumen.texto,
    filas,
    delServidor,
    yaPedido: pedido.yaPedido,
  })
  // Mientras el pedido está en camino (el primero o un «Reintentar») se espera: el esqueleto, no el error.
  const vista: VistaDelResumen =
    vistaPedida.tipo === 'error' && pedido.pendiente ? { tipo: 'cargando' } : vistaPedida
  const ultimo = useUltimo(vista.tipo === 'cotizacion' ? vista.cotizacion : null)
  const mostrada = vista.tipo === 'cotizacion' ? vista.cotizacion : ultimo
  const sinCotizacion = vista.tipo === 'no_disponible'
  return (
    <Drawer
      ancho="amplio"
      abierto={resumen.texto !== null}
      alCerrar={resumen.cerrar}
      titulo={
        sinCotizacion
          ? 'Cotización no disponible'
          : mostrada === null
            ? 'Cotización'
            : `Cotización n.º ${String(mostrada.numero)}`
      }
      descripcion={
        sinCotizacion || mostrada === null
          ? undefined
          : nombreDelOrigen(origenes, mostrada.origenId)
      }
    >
      <ContenidoDelResumen
        vista={vista}
        ultimo={ultimo}
        reintentar={pedido.pedir}
        huecos={huecos ?? {}}
        quienes={quienes ?? {}}
        deEsteVehiculo={{ aprobarEn: aprobarEn ?? SIN_DONDE_APROBAR, alCambiarLaAprobada }}
        barra={{ menuDeFila, compartirDe }}
      />
      {dialogos}
    </Drawer>
  )
}
