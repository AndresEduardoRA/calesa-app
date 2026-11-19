'use client'

import {
  aprobadaDeLaFila,
  type AprobadasDeLaPagina,
} from '../../../entities/cotizacion-aprobada-de-la-fila'
import { camposDeTarjeta } from '../../../entities/campo'
import {
  camposSinLaCompraDirecta,
  columnaDeCompraDirecta,
} from '../../../entities/compra-directa-de-la-fila'
import { columnaDePrecio } from '../../../entities/precio-de-la-fila'
import { rutaDeLaFichaDelVehiculo } from '../../../entities/acciones-de-relacionados'
import { CasillaDeSeleccion } from '../../papelera/components/casilla-de-seleccion'
import type { SeleccionDelListado } from '../../papelera/hooks/use-papelera-del-listado'
import { InsigniaDeLimpieza } from '../../limpieza/components/insignia-de-limpieza'
import { InsigniaDeVitrina } from '../../vitrina/components/insignia-de-vitrina'
import { useIdentidad } from '../hooks/use-identidad'
import { MenuDeFila } from './menu-de-fila'
import type { FilasDeLaTarjeta } from './datos-de-la-tarjeta'
import { TarjetaVehiculo } from './tarjeta-vehiculo'
import {
  faseDe,
  vitrinaDe,
  type DatosDelOrigen,
  type FilaDeVehiculo,
  type ParaElMenuDeLaLista,
} from './tipos'
import { BotonDeVitrinaDeLaFila } from '../../vitrina/components/boton-de-vitrina-de-la-fila'

type Props = DatosDelOrigen & {
  vehiculos: readonly FilaDeVehiculo[]
  menu: ParaElMenuDeLaLista
  seleccion: SeleccionDelListado
  // Su cotización aprobada por vehículo; nulo = quien mira no ve cotizaciones: el «Costo estimado» no se dibuja.
  aprobadas: AprobadasDeLaPagina | null
}

// El inventario de un origen en tarjetas (en el celular siempre; en escritorio, si la persona las eligió): una por vehículo, con lo mismo que la fila de la
// tabla (la fase, si está en la vitrina, el lote, el precio o la puja, la compra directa, el costo estimado, el «⋯» y la casilla para elegirlo). En grilla
// (una columna en el celular) con todas las filas del mismo alto (`auto-rows-fr`): la tarjeta más alta de la página manda, y cada una se estira a su fila.
export function TarjetasDeVehiculos(props: Props) {
  const { vehiculos, origen, campos, fases, vitrina, limpiezaHoy, menu, seleccion, aprobadas } =
    props
  const identidadDe = useIdentidad(campos)
  const columnaCompra = columnaDeCompraDirecta(origen.tipo === 'subasta', campos)
  const filas: FilasDeLaTarjeta = {
    columnaPrecio: columnaDePrecio(origen.tipo === 'subasta', campos),
    columnaCompra,
    campos: camposSinLaCompraDirecta(camposDeTarjeta(campos), columnaCompra),
    conCostoEstimado: aprobadas !== null,
  }
  return (
    <ul className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3">
      {vehiculos.map((vehiculo) => {
        const fase = faseDe(fases, vehiculo.faseId)
        return (
          <TarjetaVehiculo
            key={vehiculo.id}
            vehiculo={vehiculo}
            campos={campos}
            filas={filas}
            fase={fase}
            aprobada={aprobadas === null ? null : aprobadaDeLaFila(aprobadas, vehiculo.id)}
            ficha={rutaDeLaFichaDelVehiculo(vehiculo.id)}
            seleccion={
              seleccion.seleccionables.has(vehiculo.id) ? (
                <CasillaDeSeleccion
                  etiqueta={`Seleccionar ${identidadDe(vehiculo).nombre}`}
                  elegida={seleccion.elegidas.has(vehiculo.id)}
                  alCambiar={() => {
                    seleccion.alternar(vehiculo.id)
                  }}
                />
              ) : null
            }
            insignias={
              <>
                <InsigniaDeVitrina {...vitrinaDe(vehiculo, vitrina)} origen={origen} fase={fase} />
                {menu.publicar.estado === 'habilitado' ? (
                  <BotonDeVitrinaDeLaFila
                    vehiculo={vehiculo}
                    alPublicar={() => {
                      menu.abrirVitrina(vehiculo.id)
                    }}
                  />
                ) : null}
                <InsigniaDeLimpieza fecha={vehiculo.limpiezaEl} hoy={limpiezaHoy} />
              </>
            }
            acciones={<MenuDeFila vehiculo={vehiculo} fases={fases} para={menu} />}
          />
        )
      })}
    </ul>
  )
}
