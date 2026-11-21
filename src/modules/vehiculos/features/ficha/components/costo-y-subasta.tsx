'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useId, type ReactNode } from 'react'
import { Skeleton } from '@/shared/ui/skeleton'
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
import { CeldaDeCompraDirecta } from '../../listado/components/compra-directa'
import { CostoEstimado } from '../../listado/components/costo-estimado'
import {
  ProveedorDeCompartirLaAprobada,
  type CompartirLaAprobada,
} from '../../listado/hooks/compartir-de-la-aprobada'
import {
  RotuloDePrecioDeTarjeta,
  ValorDePrecioDeTarjeta,
} from '../../listado/components/precio-de-la-fila'

const VACIO = <span className="text-(--color-ink-faint)">—</span>

type Props = {
  vehiculo: Pick<
    Vehiculo,
    'precio' | 'atributos' | 'estadoSubasta' | 'situacion' | 'cierreSubastaEn'
  >
  // El precio o la puja y la compra directa: los resuelve la página con el layout del origen (como la tarjeta de la lista).
  columnaPrecio: ColumnaDePrecio
  columnaCompra: ColumnaDeCompraDirecta
  // En un origen de subasta, el instante del servidor con el que se cuenta el cierre; null = no es de subasta.
  cuenta: { ahora: string } | null
  // La fila «Costo estimado», sólo con `cotizaciones.ver` del origen: la aprobada que quien mira ve (o null) y la hoja de cotizar con este vehículo (o null sin `cotizaciones.crear`).
  costo: { aprobada: CotizacionAprobadaDeLaFila | null; cotizar: string | null } | null
  // Qué hace el «Costo estimado»: abrir «Compartir la cotización» de la aprobada (lo da `src/app`: el diálogo es de `cotizaciones`). Null: queda como texto.
  compartir: CompartirLaAprobada | null
}

function Fila({ rotulo, children }: { rotulo: ReactNode; children: ReactNode }) {
  return (
    <>
      <dt className="min-w-0 truncate text-(length:--text-sm) text-(--color-ink-soft)">{rotulo}</dt>
      <dd className="flex min-w-0 items-baseline justify-end gap-2 text-right text-(length:--text-sm) text-(--color-ink)">
        {children}
      </dd>
    </>
  )
}

// El nombre del bloque (el de su región, que sólo lee quien usa lector): lo que dicen sus filas.
function nombreDelBloque(deSubasta: boolean, conCosto: boolean): string {
  const base = deSubasta ? 'Subasta' : 'Precio'
  return conCosto ? `${base} y costo` : base
}

// Lo que dice la tarjeta de la lista sobre la subasta y el costo, en la ficha, arriba de «Datos principales»: la cuenta regresiva del cierre (sólo en un vehículo en
// subasta; sin fecha lo dice) y, en filas fijas, la puja («Puja actual» o «Puja final»; en un origen manual, «Precio»), la «Compra directa» (sólo en subasta) y el «Costo
// estimado» (el botón que abre Compartir de la aprobada; sin aprobada, «—» y «Cotizar» si se puede). Todo reusa lo de la lista: nada se dice dos veces distinto.
export function CostoYSubasta(props: Props) {
  const { vehiculo, columnaPrecio, columnaCompra, cuenta, costo, compartir } = props
  const idDelTitulo = useId()
  const precio = precioDeLaFila(vehiculo, columnaPrecio)
  const compra = compraDirectaDeLaFila(vehiculo.atributos, columnaCompra)
  const conCuenta = cuenta !== null && vehiculo.situacion === 'en_subasta'
  return (
    <ProveedorDeCompartirLaAprobada compartir={costo === null ? null : compartir}>
      <section aria-labelledby={idDelTitulo} className="grid min-w-0 gap-2">
        <h2 id={idDelTitulo} className="sr-only">
          {nombreDelBloque(cuenta !== null, costo !== null)}
        </h2>
        {conCuenta ? (
          <CuentaRegresivaDelCierre
            cierre={vehiculo.cierreSubastaEn}
            ahora={cuenta.ahora}
            className="text-(length:--text-lg) font-semibold"
          />
        ) : null}
        <dl
          className={`grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 ${conCuenta ? 'border-t border-(--color-line) pt-2' : ''}`}
        >
          <Fila rotulo={<RotuloDePrecioDeTarjeta columna={columnaPrecio} precio={precio} />}>
            <span className="whitespace-nowrap">
              {precio === null ? VACIO : <ValorDePrecioDeTarjeta precio={precio} />}
            </span>
          </Fila>
          {columnaCompra.tipo === 'no_aplica' ? null : (
            <Fila rotulo={ROTULO_DE_LA_COMPRA_DIRECTA}>
              <span className="whitespace-nowrap">
                <CeldaDeCompraDirecta valor={compra} />
              </span>
            </Fila>
          )}
          {costo === null ? null : (
            <Fila rotulo={ROTULO_DEL_COSTO_ESTIMADO}>
              {costo.aprobada === null ? (
                <>
                  {VACIO}
                  {costo.cotizar === null ? null : (
                    <Link
                      href={costo.cotizar as Route}
                      className="relative text-(--color-primary) underline underline-offset-2 max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-3 max-md:after:content-['']"
                    >
                      Cotizar
                    </Link>
                  )}
                </>
              ) : (
                <CostoEstimado aprobada={costo.aprobada} />
              )}
            </Fila>
          )}
        </dl>
      </section>
    </ProveedorDeCompartirLaAprobada>
  )
}

// Mientras se lee la aprobada: la cuenta y las tres filas, del alto que tendrán.
export function EsqueletoDeCostoYSubasta() {
  return (
    <div aria-hidden className="grid gap-2">
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-2 border-t border-(--color-line) pt-2">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-5 w-full" />
        ))}
      </div>
    </div>
  )
}
