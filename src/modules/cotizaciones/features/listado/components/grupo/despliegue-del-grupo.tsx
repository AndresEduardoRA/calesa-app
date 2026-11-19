'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import { TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { buttonVariants } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  lineasDelGrupo,
  type LineaDelGrupo as Linea,
  type PedidoDelGrupo,
} from '../../../../entities/listado/grupos-del-listado'
import { rutaDelListado } from '../../../../entities/ruta-de-la-hoja'
import { useGrupoDelListado, type GrupoLeido } from '../../hooks/use-grupo-del-listado'
import type { CompararDelGrupo } from '../tipos'
import { LineaDelGrupo } from './linea-del-grupo'

const NO_PUDIMOS = 'No pudimos cargar las cotizaciones de este vehículo.'

export type PropsDelDespliegue = {
  cabeza: Linea
  pedido: Omit<PedidoDelGrupo, 'cursor'>
  // La cotización por la que se ordenó el grupo (nula con una búsqueda: `useGrupoDelListado`).
  ordenId: string | null
  Comparar?: CompararDelGrupo | undefined
  alAbrir: (id: string) => void
  // La cotización abierta en el resumen, para marcar su línea.
  abierta: string | null
}

const BOTON = buttonVariants({
  variant: 'outline',
  className: 'min-h-11 w-full md:min-h-9 md:w-auto md:justify-self-start',
})

// Lo que va debajo de las líneas: el error de «Ver más», el tope con su camino al listado del vehículo, o «Ver más».
function Pie({ grupo, vehiculoId }: { grupo: GrupoLeido; vehiculoId: string }) {
  if (grupo.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No se pudieron cargar más.
        </p>
        <button type="button" className={BOTON} onClick={grupo.reintentar}>
          Reintentar
        </button>
      </div>
    )
  }
  if (grupo.enElTope) {
    return (
      <AvisoDeTope
        texto={textoDelTope(TOPE_DE_ESTE_VEHICULO, { articulo: 'las' })}
        camino={
          <Link
            href={rutaDelListado({ vehiculo: vehiculoId }) as Route}
            className="underline hover:text-(--color-ink)"
          >
            Ver todas en Cotizaciones
          </Link>
        }
      />
    )
  }
  return grupo.hayMasParaPedir ? (
    <button type="button" className={BOTON} disabled={grupo.cargando} onClick={grupo.verMas}>
      {grupo.cargando ? 'Cargando…' : 'Ver más'}
    </button>
  ) : null
}

// Las cotizaciones de un grupo desplegadas en el lugar (`docs/UX.md` › «Cotizaciones»): la de la tarjeta primero y las demás que coinciden, de a
// `TAMANO_DE_ESTE_VEHICULO` con «Ver más» hasta `TOPE_DE_ESTE_VEHICULO`; con el hueco de «Comparar», cada una con su casilla y el botón al pie. Se lee al
// desplegarse, desde el navegador; si falla, lo dice aquí con «Reintentar» (la lista sigue).
export function DespliegueDelGrupo({
  cabeza,
  pedido,
  ordenId,
  Comparar,
  alAbrir,
  abierta,
}: PropsDelDespliegue) {
  const grupo = useGrupoDelListado({ pedido, ordenId })
  const ruta = usePathname()
  const consulta = useSearchParams().toString()
  const { leerLaPrimera } = grupo
  // La primera página al desplegar: `leerLaPrimera` no vuelve a pedir lo leído, lo que va en camino ni lo que falló (eso es «Reintentar»).
  useEffect(() => {
    leerLaPrimera()
  }, [leerLaPrimera])

  let cuerpo
  if (!grupo.leido && grupo.error === null) {
    cuerpo = (
      <div className="grid gap-2" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    )
  } else if (!grupo.leido && grupo.error !== null) {
    cuerpo = (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {grupo.error.mensaje === MENSAJE_SIN_CONEXION ? 'No hay conexión.' : NO_PUDIMOS}
        </p>
        <button
          type="button"
          className={BOTON}
          disabled={grupo.cargando}
          onClick={grupo.reintentar}
        >
          Reintentar
        </button>
      </div>
    )
  } else {
    const lineas = lineasDelGrupo(cabeza, grupo.filas)
    const linea = (fila: { id: string }, casilla?: ReactNode) => {
      const una = lineas.find((l) => l.id === fila.id)
      return una === undefined ? null : (
        <LineaDelGrupo
          key={una.id}
          linea={una}
          enLaTarjeta={una.id === cabeza.id}
          casilla={casilla}
          alAbrir={alAbrir}
          abierta={abierta === una.id}
        />
      )
    }
    cuerpo = (
      <>
        {Comparar ? (
          <Comparar
            filas={lineas}
            volverA={consulta === '' ? ruta : `${ruta}?${consulta}`}
            linea={linea}
          />
        ) : (
          <div className="grid gap-1">{lineas.map((una) => linea(una))}</div>
        )}
        <Pie grupo={grupo} vehiculoId={pedido.vehiculoId} />
      </>
    )
  }
  return (
    <div
      data-despliegue-del-grupo=""
      className="grid gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      {cuerpo}
    </div>
  )
}
