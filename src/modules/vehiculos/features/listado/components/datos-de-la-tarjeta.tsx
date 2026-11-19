'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import type { CampoDeVehiculo } from '../../../entities/campo'
import {
  compraDirectaDeLaFila,
  ROTULO_DE_LA_COMPRA_DIRECTA,
  type ColumnaDeCompraDirecta,
} from '../../../entities/compra-directa-de-la-fila'
import {
  ROTULO_DEL_COSTO_ESTIMADO,
  type CotizacionAprobadaDeLaFila,
} from '../../../entities/cotizacion-aprobada-de-la-fila'
import { precioDeLaFila, type ColumnaDePrecio } from '../../../entities/precio-de-la-fila'
import type { Vehiculo } from '../../../entities/vehiculo'
import { CeldaDeCompraDirecta } from './compra-directa'
import { CostoEstimado } from './costo-estimado'
import { CeldaDePrecio, EncabezadoDePrecio } from './precio-de-la-fila'
import { ValorDeCampo } from './valor-de-campo'

// Lo que se resuelve una vez por página: las mismas filas en todas las tarjetas de la pestaña del origen.
export type FilasDeLaTarjeta = {
  columnaPrecio: ColumnaDePrecio
  columnaCompra: ColumnaDeCompraDirecta
  // Los campos «en tarjeta» del layout, sin el de la compra directa (ya tiene su fila).
  campos: readonly CampoDeVehiculo[]
  // Quien mira ve cotizaciones en algún origen: la fila «Costo estimado» existe.
  conCostoEstimado: boolean
}

type Props = FilasDeLaTarjeta & {
  vehiculo: Pick<Vehiculo, 'precio' | 'atributos' | 'estadoSubasta'>
  aprobada: CotizacionAprobadaDeLaFila | null
}

// Una fila de datos. Un monto no se corta (`dinero`): lo que se corta con «…» es un texto.
function Dato({
  rotulo,
  ancho = false,
  dinero = false,
  children,
}: {
  rotulo: ReactNode
  ancho?: boolean
  dinero?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('grid min-w-0', ancho && 'col-span-2')}>
      <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">{rotulo}</dt>
      <dd
        className={cn(
          'min-w-0 text-(length:--text-sm) text-(--color-ink)',
          dinero ? 'whitespace-nowrap' : 'truncate',
        )}
      >
        {children}
      </dd>
    </div>
  )
}

// Los datos de la tarjeta de la lista, pegados abajo (`mt-auto`): filas fijas, iguales en toda la pestaña, con «—» si falta el dato. Así todas las tarjetas
// miden lo mismo y sus filas quedan alineadas. Primero el precio o la puja y, en subasta, la compra directa; el costo estimado a lo ancho (monto y modo);
// después los campos «en tarjeta» de a dos. `grid-flow-row-dense`: un campo llena el hueco al lado del precio cuando no hay compra directa.
export function DatosDeLaTarjeta(props: Props) {
  const { vehiculo, aprobada, columnaPrecio, columnaCompra, campos, conCostoEstimado } = props
  return (
    <dl className="mt-auto grid grid-flow-row-dense grid-cols-2 gap-x-3 gap-y-1.5 border-t border-(--color-line) pt-3">
      <Dato rotulo={<EncabezadoDePrecio columna={columnaPrecio} />} dinero>
        <CeldaDePrecio precio={precioDeLaFila(vehiculo, columnaPrecio)} />
      </Dato>
      {columnaCompra.tipo === 'no_aplica' ? null : (
        <Dato rotulo={ROTULO_DE_LA_COMPRA_DIRECTA} dinero>
          <CeldaDeCompraDirecta valor={compraDirectaDeLaFila(vehiculo.atributos, columnaCompra)} />
        </Dato>
      )}
      {conCostoEstimado ? (
        <Dato rotulo={ROTULO_DEL_COSTO_ESTIMADO} ancho dinero>
          <CostoEstimado aprobada={aprobada} />
        </Dato>
      ) : null}
      {campos.map((campo) => (
        <Dato key={campo.clave} rotulo={campo.etiqueta}>
          <ValorDeCampo campo={campo} valor={vehiculo.atributos[campo.clave]} />
        </Dato>
      ))}
    </dl>
  )
}
