import { Suspense, type ReactNode } from 'react'
import { EsqueletoDeLaAprobada } from '@/modules/cotizaciones/pantallas/aprobada-del-vehiculo'
import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import type { Vehiculo } from '@/modules/vehiculos'
import { Skeleton } from '@/shared/ui/skeleton'
import { BloqueDeFicha } from '@/shared/ui/ficha-en-bloques'
import { BloqueAprobada } from './bloque-aprobada'
import { BloqueDatosPrincipales } from './bloque-datos-principales'
import { BloqueSubasta } from './bloque-subasta'

// Mientras se leen los datos clave: el título, cuatro datos en dos columnas y el botón.
function EsqueletoDeDatosPrincipales() {
  return (
    <div aria-hidden className="grid gap-3">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-9" />
        ))}
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  )
}

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

// La columna izquierda de la ficha, con su desplazamiento en escritorio: lo clave del vehículo, en este orden: la cabecera, «Cotización aprobada», «Subasta» (sólo en un
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
      <BloqueDeFicha ancla="datos-principales" titulo="Datos principales" lado="lateral">
        <Suspense fallback={<EsqueletoDeDatosPrincipales />}>
          <BloqueDatosPrincipales vehiculo={vehiculo} origen={origen} layout={layout} />
        </Suspense>
      </BloqueDeFicha>
    </>
  )
}
