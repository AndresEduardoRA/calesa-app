'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import { valorMostrado } from '@/shared/lib/campos'
import { ValorMostrado } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
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
import { CuentaRegresivaDelCierre } from '../../subasta/components/cuenta-regresiva-del-cierre'
import { CeldaDeCompraDirecta } from './compra-directa'
import { CostoEstimado } from './costo-estimado'
import { RotuloDePrecioDeTarjeta, ValorDePrecioDeTarjeta } from './precio-de-la-fila'

// Lo que se resuelve una vez por página: las mismas filas en todas las tarjetas de la pestaña del origen.
export type FilasDeLaTarjeta = {
  columnaPrecio: ColumnaDePrecio
  columnaCompra: ColumnaDeCompraDirecta
  // Los campos «en tarjeta» del layout, sin el de la compra directa (ya tiene su fila).
  campos: readonly CampoDeVehiculo[]
  // Quien mira ve cotizaciones en algún origen: la fila «Costo estimado» existe.
  conCostoEstimado: boolean
  // En un origen de subasta, la cuenta regresiva del cierre de cada vehículo en subasta, con el instante del servidor; nulo = no aplica.
  cuentaRegresiva: { ahora: string } | null
}

type Props = FilasDeLaTarjeta & {
  vehiculo: Pick<
    Vehiculo,
    'precio' | 'atributos' | 'estadoSubasta' | 'situacion' | 'cierreSubastaEn'
  >
  aprobada: CotizacionAprobadaDeLaFila | null
}

// Una fila de datos de la tarjeta.
type Dato = {
  clave: string
  rotulo: ReactNode
  // Nulo = falta el dato: «—».
  valor: ReactNode
  // A lo ancho (el costo estimado: monto y modo).
  ancho?: boolean
  // Un monto no se corta: lo que se corta con «…» es un texto.
  dinero?: boolean
}

// Sin envoltorio por fila (cien tarjetas son cien veces cada nodo: `docs/RENDIMIENTO.md` › «Ítems por página»): el `dt` y el `dd` van directo en la grilla, en
// ese orden, y la columna la dice la clase; `grid-flow-row-dense` pone el `dd` bajo su `dt` y llena el hueco al lado del precio. «—» es texto, sin otro nodo.
function Celdas({ dato, columna }: { dato: Dato; columna: 1 | 2 }) {
  const lugar = dato.ancho ? 'col-span-2' : columna === 1 ? 'col-start-1' : 'col-start-2'
  return (
    <>
      <dt className={cn(lugar, 'truncate pt-1.5 text-(length:--text-xs) text-(--color-ink-soft)')}>
        {dato.rotulo}
      </dt>
      <dd
        className={cn(
          lugar,
          'min-w-0 text-(length:--text-sm)',
          dato.valor === null ? 'text-(--color-ink-faint)' : 'text-(--color-ink)',
          dato.dinero ? 'whitespace-nowrap' : 'truncate',
        )}
      >
        {dato.valor ?? '—'}
      </dd>
    </>
  )
}

// Los datos de la tarjeta de la lista, pegados abajo (`mt-auto`): filas fijas, iguales en toda la pestaña, con «—» si falta el dato. Así todas las tarjetas
// miden lo mismo y sus filas quedan alineadas. Primero el precio o la puja y, en subasta, la compra directa; el costo estimado a lo ancho; después los campos
// «en tarjeta» de a dos.
export function DatosDeLaTarjeta(props: Props) {
  const { vehiculo, aprobada, columnaPrecio, columnaCompra, campos, conCostoEstimado } = props
  const { cuentaRegresiva } = props
  const { locale, zonaHoraria } = useRegional()
  const precio = precioDeLaFila(vehiculo, columnaPrecio)
  const compra = compraDirectaDeLaFila(vehiculo.atributos, columnaCompra)
  const deDos: Dato[] = [
    {
      clave: 'precio',
      rotulo: <RotuloDePrecioDeTarjeta columna={columnaPrecio} precio={precio} />,
      valor: precio === null ? null : <ValorDePrecioDeTarjeta precio={precio} />,
      dinero: true,
    },
  ]
  if (columnaCompra.tipo !== 'no_aplica') {
    deDos.push({
      clave: 'compra',
      rotulo: ROTULO_DE_LA_COMPRA_DIRECTA,
      valor: compra === null ? null : <CeldaDeCompraDirecta valor={compra} />,
      dinero: true,
    })
  }
  for (const campo of campos) {
    const mostrado = valorMostrado(campo, vehiculo.atributos[campo.clave], {
      locale,
      zona: zonaHoraria,
    })
    deDos.push({
      clave: `campo-${campo.clave}`,
      rotulo: campo.etiqueta,
      valor: mostrado.tipo === 'vacio' ? null : <ValorMostrado valor={mostrado} />,
    })
  }
  const costo: Dato | null = conCostoEstimado
    ? {
        clave: 'costo',
        rotulo: ROTULO_DEL_COSTO_ESTIMADO,
        valor: aprobada === null ? null : <CostoEstimado aprobada={aprobada} />,
        ancho: true,
        dinero: true,
      }
    : null
  // El costo estimado va después de la primera fila de a dos.
  const datos = costo === null ? deDos : [...deDos.slice(0, 2), costo, ...deDos.slice(2)]
  let enFila = 0
  // Arriba de la línea que separa los datos, la cuenta del cierre (sólo en un vehículo en subasta); ella o, si no hay, los datos van pegados abajo.
  const conCuenta = cuentaRegresiva !== null && vehiculo.situacion === 'en_subasta'
  return (
    <>
      {conCuenta ? (
        <CuentaRegresivaDelCierre
          cierre={vehiculo.cierreSubastaEn}
          ahora={cuentaRegresiva.ahora}
          className="mt-auto"
        />
      ) : null}
      <dl
        className={cn(
          conCuenta ? 'mt-1' : 'mt-auto',
          'grid grid-flow-row-dense grid-cols-2 gap-x-3 border-t border-(--color-line) pt-1.5',
        )}
      >
        {datos.map((dato) => {
          const columna = dato.ancho ? 1 : (((enFila++ % 2) + 1) as 1 | 2)
          return <Celdas key={dato.clave} dato={dato} columna={columna} />
        })}
      </dl>
    </>
  )
}
