'use client'

import { useEffect, type ReactNode } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoError } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  NOMBRE_DEL_TIPO,
  TEXTO_DE_CORTADA,
  type FilaRelacionada,
  type LeadRelacionado,
  type VehiculoRelacionado,
} from '../../../entities/relacionados'
import {
  usePaginasDeRelacionados,
  type ListaDeRelacionados,
} from '../hooks/use-paginas-de-relacionados'

type Fila = FilaRelacionada<LeadRelacionado | VehiculoRelacionado>

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Qué lista es: de quién y de qué tipo.
  lista: ListaDeRelacionados
  // Cómo se dibuja una fila (con sus acciones): lo sabe quien conoce a la contraparte.
  filaDe: (fila: Fila) => ReactNode
  // Sustantivo del tope: «leads» o «vehículos».
  sustantivo: string
}

function Contenido({ lista, filaDe, sustantivo }: Omit<Props, 'abierto' | 'alCerrar'>) {
  const paginas = usePaginasDeRelacionados(lista)
  const { leerLaPrimera } = paginas
  useEffect(() => {
    leerLaPrimera()
  }, [leerLaPrimera])
  if (!paginas.leido) {
    return paginas.error ? (
      <div role="alert">
        <EstadoError
          titulo="No pudimos cargar los relacionados."
          alReintentar={paginas.reintentar}
        />
      </div>
    ) : (
      <div aria-busy="true" aria-label="Cargando" className="grid gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">{paginas.filas.map(filaDe)}</ul>
      {paginas.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            No se pudieron cargar más.
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={paginas.reintentar}
          >
            Reintentar
          </Button>
        </div>
      ) : null}
      {paginas.cortada ? (
        <div role="status" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{TEXTO_DE_CORTADA}</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={paginas.cargando}
            onClick={paginas.seguirBuscando}
          >
            {paginas.cargando ? 'Buscando…' : 'Seguir buscando'}
          </Button>
        </div>
      ) : null}
      {paginas.enElTope ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_LO_CARGADO, { sustantivo })} />
      ) : null}
      {paginas.hayMasParaPedir && !paginas.error ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={paginas.cargando}
          onClick={paginas.verMas}
        >
          {paginas.cargando ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
      {paginas.filas.length === 0 && !paginas.cortada ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Nada que ver por acá.</p>
      ) : null}
    </div>
  )
}

// «Ver todos» de un grupo de relacionados (`?relacionados=<tipo>`): de a `TAMANO_DE_RELACIONADOS` por cursor con «Ver más», hasta el tope de lo cargado. Sólo muestra: lo que se hace con
// una fila es de su «⋯». El contenido se monta en cada apertura, dentro del mismo drawer.
export function DrawerDeRelacionados({ abierto, alCerrar, lista, filaDe, sustantivo }: Props) {
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo={`${NOMBRE_DEL_TIPO[lista.tipo]} · todos`}>
      {abierto ? <Contenido lista={lista} filaDe={filaDe} sustantivo={sustantivo} /> : null}
    </Drawer>
  )
}
