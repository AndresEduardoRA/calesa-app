'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import { TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { buttonVariants } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  lineasDelGrupo,
  type LineaDelGrupo as Linea,
  type PedidoDelGrupo,
} from '../../../../entities/listado/grupos-del-listado'
import { rutaDelListado } from '../../../../entities/ruta-de-la-hoja'
import { useGrupoDelListado, type GrupoLeido } from '../../hooks/use-grupo-del-listado'
import type { CompararDelGrupo, FilaDeCotizacion } from '../tipos'
import { LineaDelGrupo } from './linea-del-grupo'

const NO_PUDIMOS = 'No pudimos cargar las cotizaciones de este vehículo.'

export type PropsDelModalDelGrupo = {
  abierto: boolean
  alCerrar: () => void
  // «Cotizaciones de <vehículo>» (`tituloDelModalDelGrupo()`).
  titulo: string
  // La cabeza del grupo en la página (su aprobada si quien mira la ve): va primera. Nula si el enlace abrió un grupo que no está en la página.
  cabeza: FilaDeCotizacion | null
  pedido: Omit<PedidoDelGrupo, 'cursor'>
  // La cotización por la que se ordenó el grupo (nula con una búsqueda o sin cabeza: `useGrupoDelListado`).
  ordenId: string | null
  Comparar?: CompararDelGrupo | undefined
  // Una línea elegida: quien monta cierra el modal y abre su resumen.
  alAbrir: (id: string) => void
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

const ESQUELETO = (
  <div className="grid gap-2" aria-busy="true">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-2/3" />
  </div>
)

type PropsDelCuerpo = {
  grupo: GrupoLeido
  lineas: readonly Linea[]
  cabeza: FilaDeCotizacion | null
  vehiculoId: string
  casilla: ((fila: Linea) => ReactNode) | undefined
  alAbrir: (id: string) => void
}

// Lo que va dentro del modal: el esqueleto, el error con «Reintentar» o las líneas con su pie.
function CuerpoDelGrupo({ grupo, lineas, cabeza, vehiculoId, casilla, alAbrir }: PropsDelCuerpo) {
  if (!grupo.leido && grupo.error === null) {
    return ESQUELETO
  }
  if (!grupo.leido) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {grupo.error?.mensaje === MENSAJE_SIN_CONEXION ? 'No hay conexión.' : NO_PUDIMOS}
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
  }
  return (
    <>
      <div className="grid gap-1">
        {lineas.map((una) => (
          <LineaDelGrupo
            key={una.id}
            linea={una}
            aprobada={cabeza?.aprobada === true && una.id === cabeza.id}
            casilla={casilla?.(una)}
            alAbrir={alAbrir}
          />
        ))}
      </div>
      <Pie grupo={grupo} vehiculoId={vehiculoId} />
    </>
  )
}

// Las cotizaciones de un vehículo de la lista agrupada en un modal (`docs/UX.md` › «Cotizaciones»): la cabeza primero y las demás que coinciden con la búsqueda y los
// filtros, de a `TAMANO_DE_ESTE_VEHICULO` con «Ver más» hasta `TOPE_DE_ESTE_VEHICULO`. Con el hueco de «Comparar», cada una con su casilla y el botón en el pie del modal
// (las elegidas viven en el hueco: cada apertura, `key` nueva, empieza sin elegir). Se lee al montarse, desde el navegador; si falla, lo dice dentro con «Reintentar» (la
// lista de atrás sigue). Elegir una línea cierra el modal y abre su resumen: el foco va al resumen, no vuelve al botón del conteo.
export function ModalDelGrupo({
  abierto,
  alCerrar,
  titulo,
  cabeza,
  pedido,
  ordenId,
  Comparar,
  alAbrir,
}: PropsDelModalDelGrupo) {
  const grupo = useGrupoDelListado({ pedido, ordenId })
  const ruta = usePathname()
  const consulta = useSearchParams().toString()
  const abriendoUna = useRef(false)
  const { leerLaPrimera } = grupo
  // La primera página al montarse: `leerLaPrimera` no vuelve a pedir lo leído, lo que va en camino ni lo que falló (eso es «Reintentar»).
  useEffect(() => {
    leerLaPrimera()
  }, [leerLaPrimera])

  const lineas = grupo.leido ? lineasDelGrupo<Linea>(cabeza, grupo.filas) : []
  const volverA = consulta === '' ? ruta : `${ruta}?${consulta}`
  const dibujar = (casilla?: (fila: Linea) => ReactNode, pie?: ReactNode) => (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={titulo}
      ancho="amplio"
      completoEnCelular
      focoAlCerrar={() => !abriendoUna.current}
      pie={pie}
    >
      <div data-modal-del-grupo="" className="grid gap-2">
        <CuerpoDelGrupo
          grupo={grupo}
          lineas={lineas}
          cabeza={cabeza}
          vehiculoId={pedido.vehiculoId}
          casilla={casilla}
          alAbrir={(id) => {
            abriendoUna.current = true
            alAbrir(id)
          }}
        />
      </div>
    </Modal>
  )
  // Sin el hueco no hay casillas ni pie; con él, el hueco da la casilla de cada línea y «Comparar» para el pie, y el modal se dibuja dentro (no llega hasta que llega su código).
  if (Comparar === undefined) {
    return dibujar()
  }
  return (
    <Comparar volverA={volverA}>
      {({ casilla, pie }) => dibujar(casilla, grupo.leido ? pie(lineas) : undefined)}
    </Comparar>
  )
}
