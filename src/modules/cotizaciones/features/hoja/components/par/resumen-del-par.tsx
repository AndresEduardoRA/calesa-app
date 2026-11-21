'use client'

import type { ContextoDeHoja } from '../../../../entities/binding'
import { nombreDelModo } from '../../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../../entities/hoja'
import type { ParDeHoja } from '../../../../entities/hoja-en-par'
import type { ColumnaDeLaHoja } from '../../hooks/use-hoja-en-par'
import type { VistaDelGuardado } from '../../hooks/use-nucleo-del-guardado'
import { AvisoDelGuardado } from '../aviso-de-guardado'
import { ResumenDeHoja, type BotonDeGuardar } from '../resumen-de-hoja'
import { VistaPreviaDeLaHojaViva } from '../vista-previa-de-la-hoja'
import type { PropsDeLaHojaEnPar } from './hoja-en-par'
import { TotalesEnPar } from './totales-en-par'

type DeDos<T> = readonly [T, T]

// Lo que dijo el último guardado (nada si la hoja no guarda).
function avisoDe(
  vista: VistaDelGuardado | null,
  boton: BotonDeGuardar | null,
  {
    hoja,
    props,
    alRecargar,
  }: { hoja: HojaLista; props: PropsDeLaHojaEnPar; alRecargar: () => void },
) {
  if (vista === null || boton === null) return null
  return (
    <AvisoDelGuardado
      guardado={vista}
      alReintentar={boton.alGuardar}
      version={hoja.formula.version}
      alRecargar={alRecargar}
      confirmacion={props.edicion ? 'Cambios guardados.' : null}
      elecciones={props.elecciones}
    />
  )
}

// «Vista previa» de la hoja en par: la tarjeta de la cotización abierta y la de su hermana, una bajo la otra en el orden de las opciones.
function VistaPreviaDelPar({
  hoja,
  par,
  columnas,
  props,
  hayCambios,
}: {
  hoja: HojaLista
  par: ParDeHoja
  columnas: DeDos<ColumnaDeLaHoja>
  props: PropsDeLaHojaEnPar
  hayCambios: boolean
}) {
  const abierta = props.abierta ?? 0
  const otra = abierta === 0 ? 1 : 0
  return (
    <VistaPreviaDeLaHojaViva
      hoja={hoja}
      h={columnas[abierta]}
      {...props.deLoGuardado}
      hayCambios={hayCambios}
      opcion={par.opciones[abierta].etiqueta}
      hermana={{
        h: columnas[otra],
        calculo: props.deLaHermana?.calculo,
        opcion: par.opciones[otra].etiqueta,
        antes: otra < abierta,
        ...(props.deLaHermana ? { pagina: props.deLaHermana.pagina } : {}),
      }}
    />
  )
}

// El resumen de la hoja en par: el de siempre (el modo, «Guardar», sus avisos, la vista previa y Live) con los dos totales en lugar del total.
export function ResumenDelPar({
  hoja,
  par,
  h,
  columnas,
  contextos,
  props,
  vista,
  boton,
  hayCambios,
  alRecargar,
}: {
  hoja: HojaLista
  par: ParDeHoja
  h: ColumnaDeLaHoja
  columnas: DeDos<ColumnaDeLaHoja>
  contextos: DeDos<ContextoDeHoja>
  props: PropsDeLaHojaEnPar
  vista: VistaDelGuardado | null
  boton: BotonDeGuardar | null
  hayCambios: boolean
  alRecargar: () => void
}) {
  const monedaDelTotalBs = h.verTotalBs ? hoja.cabecera.monedaBs : null
  return (
    <ResumenDeHoja
      tarjeta={hoja.tarjetaTotal}
      monedaDelTotalBs={monedaDelTotalBs}
      modo={nombreDelModo(hoja.cabecera, h.entradas.modoTc)}
      contexto={contextos[0]}
      estado={h.estado}
      avisoDelVehiculo={props.vehiculoSoltado ? 'No se puede usar ese vehículo.' : null}
      alReintentar={h.reintentar}
      alRecargar={alRecargar}
      guardar={boton}
      soloLectura={props.soloLectura ?? false}
      totalGuardado={props.totalGuardado}
      totales={
        <TotalesEnPar
          tarjeta={hoja.tarjetaTotal}
          par={par}
          columnas={[
            {
              contexto: contextos[0],
              estado: columnas[0].estado,
              alReintentar: columnas[0].reintentar,
            },
            {
              contexto: contextos[1],
              estado: columnas[1].estado,
              alReintentar: columnas[1].reintentar,
            },
          ]}
          monedaDelTotalBs={monedaDelTotalBs}
          alRecargar={alRecargar}
        />
      }
      vistaPrevia={
        <VistaPreviaDelPar
          hoja={hoja}
          par={par}
          columnas={columnas}
          props={props}
          hayCambios={hayCambios}
        />
      }
      avisoDeGuardado={avisoDe(vista, boton, { hoja, props, alRecargar })}
      interruptor={props.privada?.interruptor ?? null}
    />
  )
}
