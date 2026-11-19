import { Suspense, type ReactNode } from 'react'
import { EsqueletoDeLaAprobada } from '@/modules/cotizaciones/pantallas/aprobada-del-vehiculo'
import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import type { Vehiculo } from '@/modules/vehiculos'
import { DatosPrincipalesDelVehiculo } from '@/modules/vehiculos/pantallas/ficha'
import { BloqueDeFicha } from '@/shared/ui/ficha-en-bloques'
import { BloqueAprobada } from './bloque-aprobada'
import { BloqueSubasta } from './bloque-subasta'

type Props = {
  // La cabecera (`Encabezado`): la foto con su tira, la vitrina y el «⋯», título, número, origen, situación y enlaces cortos.
  encabezado: ReactNode
  vehiculo: Vehiculo
  origen: OrigenResumen
  layout: LayoutDeOrigen
  editable: boolean
  // «Compra directa» en «Subasta»: el origen trae el «Buy it now» de apibara.
  conCompraDirecta: boolean
  // «Cotización aprobada» con `cotizaciones.ver` del origen (null: ni el bloque ni la consulta) y lo que ofrece sin aprobada.
  aprobada: { cotizar: string | null } | null
}

// La columna izquierda de la ficha, pegajosa en escritorio: lo clave del vehículo, en este orden: la cabecera, «Cotización aprobada», «Subasta» (sólo en un
// origen de subasta) y «Datos principales». Cada bloque con su límite de error; ninguno entra al índice (el índice es de la derecha).
export function LateralDeLaFicha({
  encabezado,
  vehiculo,
  origen,
  layout,
  editable,
  aprobada,
  conCompraDirecta,
}: Props) {
  return (
    <>
      {encabezado}
      {aprobada === null ? null : (
        <BloqueDeFicha ancla="aprobada" titulo="Cotización aprobada" conTitulo lado="lateral">
          <Suspense fallback={<EsqueletoDeLaAprobada />}>
            <BloqueAprobada vehiculo={vehiculo} cotizar={aprobada.cotizar} />
          </Suspense>
        </BloqueDeFicha>
      )}
      {origen.tipo === 'subasta' ? (
        <BloqueDeFicha ancla="subasta" titulo="Subasta" lado="lateral">
          <Suspense fallback={null}>
            <BloqueSubasta
              vehiculo={vehiculo}
              editable={editable}
              conCompraDirecta={conCompraDirecta}
            />
          </Suspense>
        </BloqueDeFicha>
      ) : null}
      <DatosPrincipalesDelVehiculo
        vehiculo={vehiculo}
        origen={origen}
        categorias={layout.categorias}
      />
    </>
  )
}
