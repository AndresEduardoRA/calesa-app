'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoPaginaSinFilas, EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { UnaSolaVista } from '@/shared/ui/lista'
import { Paginacion } from '@/shared/ui/paginacion'
import type { VehiculoDeLaFase } from '../../../entities/cadena/leer'
import { useIrALaUnidad } from '../../nucleo/hooks/use-ir-a-la-unidad'
import { TablaDeLaFase } from './tabla-de-la-fase'
import { TarjetasDeLaFase } from './tarjetas-de-la-fase'

type Props = {
  vehiculos: readonly VehiculoDeLaFase[]
  // El cursor de la página que sigue (nulo: no hay más). La lista sólo camina hacia adelante: «Volver al principio» es lo que ofrece.
  siguiente: string | null
  ahora: Date
  // A dónde lleva «Ver la cadena» cuando la fase está vacía.
  hrefDeLaCadena: string
  seleccion: {
    elegido: (id: string) => boolean
    alternar: (vehiculo: VehiculoDeLaFase) => void
    elegirLaPagina: () => void
    paginaCompleta: boolean
  } | null
}

// Dónde estás: sin total ni «Página N». Con cursor se ofrece volver al principio (la base sólo camina hacia adelante).
function DondeEstas() {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  if (!parametros.has(CLAVE_DE_CURSOR)) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Los más antiguos en la fase, primero.
      </p>
    )
  }
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Siguientes a los anteriores.</span>
      <Link
        href={`${ruta}?${parametros.toString()}` as Route}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Volver al principio
      </Link>
    </p>
  )
}

// La lista o el estado que corresponda: vacío de primera vez (con el camino a la cadena), vacío por filtro (con «Limpiar») o una página que se quedó sin filas. Una sola vista
// (`<UnaSolaVista>`): la tabla desde `md` y las tarjetas por debajo. Ningún total ni suma.
export function ResultadoDeLaFase({
  vehiculos,
  siguiente,
  ahora,
  hrefDeLaCadena,
  seleccion,
}: Props) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  const alAbrir = useIrALaUnidad()

  if (vehiculos.length === 0) {
    if (filtros.hayFiltros) {
      return (
        <EstadoSinResultados
          alLimpiar={filtros.limpiar}
          descripcion="Ningún vehículo coincide con los filtros."
        />
      )
    }
    if (hayCursor) {
      return <EstadoPaginaSinFilas />
    }
    return (
      <EstadoVacio
        titulo="No hay vehículos en esta fase."
        accion={
          <Link href={hrefDeLaCadena as Route} className={buttonVariants({ variant: 'outline' })}>
            Ver la cadena
          </Link>
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <DondeEstas />
      <UnaSolaVista
        tabla={() => (
          <TablaDeLaFase
            vehiculos={vehiculos}
            ahora={ahora}
            alAbrir={alAbrir}
            seleccion={seleccion}
          />
        )}
        tarjetas={() => (
          <TarjetasDeLaFase
            vehiculos={vehiculos}
            ahora={ahora}
            alAbrir={alAbrir}
            seleccion={seleccion}
          />
        )}
      />
      <Paginacion siguiente={siguiente} anterior={null} />
    </div>
  )
}
