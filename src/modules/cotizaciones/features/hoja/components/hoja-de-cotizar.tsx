'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef, type ReactNode } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EstiloDeTonos, SimbolosDeXCell } from '@/shared/ui/xcell'
import type { RecalculoInicial } from '../../../entities/apertura'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import { seccionSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import { nombreDelModo } from '../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import {
  eleccionesDeUnaGuardada,
  type EleccionesDeLaHoja,
  type ObligatoriosAlCotizar,
} from '../../../entities/obligatorios-al-cotizar'
import { useBotonesDeGuardar } from '../hooks/use-botones-de-guardar'
import type { EdicionDeLaHoja } from '../hooks/use-guardar-la-guardada'
import type { useGuardarLaHoja } from '../hooks/use-guardar-la-hoja'
import type { Guardado, VistaDelGuardado } from '../hooks/use-nucleo-del-guardado'
import { useHoja, type AperturaDeHoja } from '../hooks/use-hoja'
import { AvisoDelGuardado } from './aviso-de-guardado'
import { CabeceraDeHoja } from './cabecera-de-hoja'
import { ResumenDeHoja } from './resumen-de-hoja'
import { SeccionesDeLaHoja } from './secciones-de-la-hoja'
import { VistaPreviaDeLaHojaViva } from './vista-previa-de-la-hoja'

type Props = {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  // El vehículo de la URL que la base no dejó usar: se calculó sin él.
  vehiculoSoltado: boolean
  leadId: string | null
  // Lo que el rol pide elegir antes de guardar en este origen y cómo se elige (`obligatoriosAlCotizar()` y `eleccionesDeLaHoja()`, calculados en el servidor). Sin ellos, la hoja no
  // pide nada: una guardada no los trae.
  obligatorios?: ObligatoriosAlCotizar
  elecciones?: EleccionesDeLaHoja
  // Nulo: la hoja no guarda (una guardada de sólo lectura, o todavía sin «Guardar»).
  guardado: Guardado | null
  // El borrador de lo tipeado: su clave en la pestaña (de quien cotiza) y «Descartar», con el que el marco vuelve a montar la hoja vacía. Sin él, no hay borrador.
  borrador?: { clave: string; alDescartar: () => void } | undefined
  // Quien sólo ve una cotización guardada: los modos y «Ver total Bs» se ven y no se tocan, y el resumen lo dice.
  soloLectura?: boolean
  // El total con que se guardó, cuando lo de hoy no es lo guardado (C11): lo dibuja el resumen bajo el total.
  totalGuardado?: ReactNode
  // Los campos del vehículo que quien mira elige en el panel del vehículo (4.14-2c3): la celda sin valor por uno de ellos dice dónde se elige.
  seEligen?: ReadonlySet<string> | undefined
  // De dónde calcula y con qué abre (C1, C2). Sin nada, la hoja nueva.
  abre?: AperturaDeHoja
  // Una cotización guardada que quien mira puede guardar (4.15-3): su guardado, su versión y si lo de hoy no es lo guardado. Con ella, `guardado` va nulo.
  edicion?: EdicionDeLaHoja
  // «Recargar»: sin nada, vuelve a pedir la página al servidor; el marco de una guardada lo suma para volver a montar la hoja con lo que llegue (4.15-3).
  alRecargar?: () => void
  // Lo que el marco de una guardada pone sobre la hoja (el aviso de versión, 4.15-3b); recibe si hay cambios sin guardar. La hoja nueva no lo llena.
  encima?: (hayCambios: boolean) => ReactNode
  // Lo que dibuja la vista previa de una guardada: lo guardado (P5 a, `calculoDeLoGuardado`) y si lo de hoy no lo es (`difiereAlAbrir`: la vista previa lo dice fuera de la
  // tarjeta). Sin él, la tarjeta dibuja lo que la hoja calcula ahora (la hoja nueva).
  deLoGuardado?: { calculo: CalculoDeLaTarjeta; difiere: boolean }
}

// Las salidas del aviso de guardado: las de la hoja nueva o, en una guardada, «Escribir el título» y, si puede cambiarlo, «Elegir otro vehículo» (abren el panel del vehículo).
const eleccionesDelAviso = (
  elecciones: EleccionesDeLaHoja | undefined,
  edicion: EdicionDeLaHoja | undefined,
): EleccionesDeLaHoja | undefined =>
  elecciones ??
  (edicion?.panelDelTitulo === undefined
    ? undefined
    : eleccionesDeUnaGuardada(edicion.panelDelTitulo, { cambiaVehiculo: edicion.cambiaVehiculo }))

// Puede cotizar en el origen pero su rol no ve ningún dato de la hoja (`cotizaciones.ver`): no hay nada que dibujar ni un total que dar.
function SinDatosQueVer() {
  return (
    <EstadoSinPermiso
      titulo="No puedes ver esta hoja"
      descripcion="Tu rol puede cotizar en este origen, pero no ve los datos de su hoja. Pídeselo a quien administra los roles."
    />
  )
}

// Lo que ven las celdas: el índice, lo tipeado, la última respuesta y los campos que se eligen en el panel del vehículo.
function useContextoDeLaHoja(
  h: ReturnType<typeof useHoja>,
  seEligen: ReadonlySet<string> | undefined,
) {
  return useMemo<ContextoDeHoja>(
    () => ({
      indice: h.indice,
      entradas: h.entradas,
      respuesta: h.respuesta,
      ...(seEligen ? { seEligen } : {}),
    }),
    [h.indice, h.entradas, h.respuesta, seEligen],
  )
}

type PropsDelResumen = Pick<Props, 'hoja' | 'totalGuardado' | 'alRecargar'> & {
  // Lo de una guardada para «Vista previa»: lo guardado que dibuja la tarjeta (nulo en la hoja nueva), si lo de hoy difiere y si hay cambios sin guardar.
  laTarjeta: Partial<NonNullable<Props['deLoGuardado']>> & { hayCambios: boolean }
  guardado: VistaDelGuardado | null
  // «Cambios guardados.» de una guardada.
  confirmacion: string | null
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  vehiculoSoltado: boolean
  elecciones: EleccionesDeLaHoja | undefined
  boton: ReturnType<typeof useGuardarLaHoja>['boton']
  soloLectura: boolean
}

// El resumen con lo que la hoja le da: lo que dice del vehículo, el botón de guardar (o nada, si no guarda) y lo que dijo el último guardado.
function ResumenDeLaHoja({
  hoja,
  h,
  contexto,
  vehiculoSoltado,
  elecciones,
  guardado,
  confirmacion,
  boton,
  soloLectura,
  totalGuardado,
  alRecargar,
  laTarjeta,
}: PropsDelResumen) {
  const router = useRouter()
  const recargar = alRecargar ?? router.refresh
  return (
    <ResumenDeHoja
      tarjeta={hoja.tarjetaTotal}
      monedaDelTotalBs={h.verTotalBs ? hoja.cabecera.monedaBs : null}
      modo={nombreDelModo(hoja.cabecera, h.entradas.modoTc)}
      contexto={contexto}
      estado={h.estado}
      avisoDelVehiculo={vehiculoSoltado ? 'No se puede usar ese vehículo.' : null}
      alReintentar={h.reintentar}
      alRecargar={recargar}
      guardar={boton}
      soloLectura={soloLectura}
      totalGuardado={totalGuardado}
      vistaPrevia={<VistaPreviaDeLaHojaViva hoja={hoja} h={h} {...laTarjeta} />}
      avisoDeGuardado={
        guardado === null || boton === null ? null : (
          <AvisoDelGuardado
            guardado={guardado}
            alReintentar={boton.alGuardar}
            version={hoja.formula.version}
            alRecargar={recargar}
            confirmacion={confirmacion}
            elecciones={elecciones}
          />
        )
      }
    />
  )
}

// Los iconos y los tonos, una sola vez por hoja.
function SimbolosYTonos({ tonos }: { tonos: HojaLista['tonos'] }) {
  return (
    <>
      <SimbolosDeXCell />
      <EstiloDeTonos tonos={tonos} />
    </>
  )
}

// «Recargar»: sin nada, vuelve a pedir la página al servidor; el marco de una guardada lo suma para volver a montar la hoja con lo que llegue (4.15-3).
function useRecargar(alRecargar: (() => void) | undefined): () => void {
  const router = useRouter()
  return alRecargar ?? router.refresh
}

// La columna de la izquierda: lo que se pone encima (el aviso de versión de una guardada), la cabecera (modos y «Ver total Bs») y las secciones del diseño.
function ColumnaDeLaHoja({
  hoja,
  h,
  contexto,
  secciones,
  guardando,
  soloLectura,
  encima,
  alRecargar,
}: {
  hoja: HojaLista
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  secciones: HojaLista['secciones']
  guardando: boolean
  soloLectura: boolean
  encima: ReactNode
  alRecargar: () => void
}) {
  return (
    <div className="grid min-w-0 flex-1 gap-4">
      {encima}
      <CabeceraDeHoja
        cabecera={hoja.cabecera}
        modoElegido={h.entradas.modoTc}
        alElegirModo={h.acciones.alElegirModo}
        verTotalBs={h.verTotalBs}
        alCambiarVerTotalBs={h.alCambiarVerTotalBs}
        deshabilitado={soloLectura}
      />
      <SeccionesDeLaHoja
        secciones={secciones}
        contexto={contexto}
        acciones={h.acciones}
        guardando={guardando}
        de={h.de}
        formula={hoja.formula}
        alRecargar={alRecargar}
      />
    </div>
  )
}

// La hoja de cotizar: las secciones del diseño en su orden (las avanzadas, detrás de un botón «Avanzado» con su modal), cada celda con su `XCell`, y el resumen. Recalcula en la base 150 ms después de la última confirmación.
// Guarda con `Ctrl/Cmd+S` o «Guardar» (el guardado vive en el marco, `useGuardado`): confirma la celda abierta, espera al total al día (P8) y arma el pedido con las
// entradas que ese recálculo calculó y la misma hoja abierta. Mientras guarda no se toca (`inert`): lo guardado la reemplaza y lo tecleado en el medio se perdería sin aviso. Los iconos y los tonos se montan una sola vez por hoja.
export function HojaDeCotizar({
  hoja,
  inicial,
  vehiculoId,
  vehiculoSoltado,
  leadId,
  obligatorios,
  elecciones,
  borrador,
  guardado,
  seEligen,
  abre,
  edicion,
  soloLectura = false,
  totalGuardado,
  alRecargar,
  encima,
  deLoGuardado,
}: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const recargar = useRecargar(alRecargar)
  const vista = edicion?.guardado ?? guardado // el de la guardada que edita o el de la nueva
  const h = useHoja({
    hoja,
    inicial,
    vehiculoId,
    alCambiar: vista?.olvidarAviso,
    borrador,
    ...abre,
  })
  const contexto = useContextoDeLaHoja(h, seEligen)
  const { boton, hayCambios } = useBotonesDeGuardar({
    h,
    contexto,
    hoja,
    leadId,
    vehiculoId,
    obligatorios,
    elecciones,
    guardado,
    edicion,
    raiz,
  })
  const guardando = vista?.estado.tipo === 'guardando'
  const dibujadas = hoja.secciones.filter((seccion) => seccionSeDibuja(seccion, contexto))
  if (dibujadas.length === 0) {
    return <SinDatosQueVer />
  }
  return (
    <div ref={raiz} data-hoja="" inert={guardando} className="@container/hoja grid min-w-0 gap-4">
      <SimbolosYTonos tonos={hoja.tonos} />
      <div className="flex min-w-0 flex-col gap-4 @4xl/hoja:flex-row @4xl/hoja:items-start">
        <ColumnaDeLaHoja
          hoja={hoja}
          h={h}
          contexto={contexto}
          secciones={dibujadas}
          guardando={guardando}
          soloLectura={soloLectura}
          encima={encima?.(hayCambios)}
          alRecargar={recargar}
        />
        <ResumenDeLaHoja
          hoja={hoja}
          h={h}
          contexto={contexto}
          vehiculoSoltado={vehiculoSoltado}
          elecciones={eleccionesDelAviso(elecciones, edicion)}
          guardado={vista}
          confirmacion={edicion ? 'Cambios guardados.' : null}
          boton={boton}
          soloLectura={soloLectura}
          totalGuardado={totalGuardado}
          alRecargar={alRecargar}
          laTarjeta={{ ...deLoGuardado, hayCambios }}
        />
      </div>
    </div>
  )
}
