import { Suspense, type ReactNode } from 'react'
import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import type { Vehiculo } from '@/modules/vehiculos'
import { EsqueletoDeCostoYSubasta } from '@/modules/vehiculos/pantallas/ficha'
import { Skeleton } from '@/shared/ui/skeleton'
import { BloqueDeFicha } from '@/shared/ui/ficha-en-bloques'
import { BloqueCostoYSubasta } from './bloque-costo-y-subasta'
import { BloqueDatosPrincipales } from './bloque-datos-principales'

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
  // La fila «Costo estimado» con `cotizaciones.ver` del origen (null: ni la fila ni la consulta) y lo que ofrece sin aprobada.
  costo: { cotizar: string | null } | null
}

// La columna izquierda de la ficha, con su desplazamiento en escritorio: lo clave del vehículo, en este orden: la cabecera, la subasta y el costo (la cuenta del cierre, la puja, la
// compra directa y el «Costo estimado», como la tarjeta de la lista; sin título, su región se llama por lo que dice) y «Datos principales». Cada bloque con su límite de error;
// ninguno entra al índice (el índice es de la derecha).
export function LateralDeLaFicha({ encabezado, vehiculo, origen, layout, costo }: Props) {
  return (
    <>
      {encabezado}
      <BloqueDeFicha ancla="costo-y-subasta" titulo="Subasta y costo" lado="lateral">
        <Suspense fallback={<EsqueletoDeCostoYSubasta />}>
          <BloqueCostoYSubasta
            vehiculo={vehiculo}
            campos={layout.campos}
            deSubasta={origen.tipo === 'subasta'}
            costo={costo}
          />
        </Suspense>
      </BloqueDeFicha>
      <BloqueDeFicha ancla="datos-principales" titulo="Datos principales" lado="lateral">
        <Suspense fallback={<EsqueletoDeDatosPrincipales />}>
          <BloqueDatosPrincipales vehiculo={vehiculo} origen={origen} layout={layout} />
        </Suspense>
      </BloqueDeFicha>
    </>
  )
}
