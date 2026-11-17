'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { textoDelTope } from '@/shared/lib/conteo'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useComprasDelItem } from '../hooks/use-compras-del-item'
import { ListaDeCompras } from './lista-de-compras'

type Props = {
  itemId: string
  // A dónde llevan los enlaces (los arma `src/app`, que conoce la URL del proyecto): el formulario con el ítem ya elegido y el panel «Compras».
  hrefRegistrar: string
  hrefVerTodas: string
  // Nulo = se puede registrar; si no, el motivo (`motivoParaNoEscribirCompras`).
  motivoParaNoRegistrar: string | null
}

const CLASE_DEL_ENLACE = buttonVariants({
  variant: 'outline',
  size: 'sm',
  className: 'min-h-11 md:min-h-9',
})

// El bloque «Compras» del panel del ítem (sólo con `repuestos.costos.ver`): las del ítem, hasta `TAMANO_DE_VER_MAS`, y los caminos a registrar otra y a todas las del
// proyecto. Lee al montarse; mientras lee, tres renglones; si falla, «Reintentar».
export function BloqueDeComprasDelItem({
  itemId,
  hrefRegistrar,
  hrefVerTodas,
  motivoParaNoRegistrar,
}: Props) {
  const { lectura, reintentar } = useComprasDelItem(itemId)
  const acciones = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {motivoParaNoRegistrar === null ? (
        <Link href={hrefRegistrar as Route} className={CLASE_DEL_ENLACE}>
          Registrar compra
        </Link>
      ) : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{motivoParaNoRegistrar}</p>
      )}
      <Link href={hrefVerTodas as Route} className={CLASE_DEL_ENLACE}>
        Ver todas en Compras
      </Link>
    </div>
  )
  if (lectura.estado === 'leyendo') {
    return (
      <div role="status" aria-label="Cargando las compras del ítem" className="grid gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    )
  }
  if (lectura.estado === 'fallo') {
    return (
      <div className="grid gap-2">
        <Aviso tono="peligro">
          <p>{lectura.error.mensaje}</p>
        </Aviso>
        <div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={reintentar}
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }
  const { filas, hayMas } = lectura.dato
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {filas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Este ítem no tiene compras registradas.
        </p>
      ) : (
        <ListaDeCompras filas={filas} hayMas={false} etiqueta="Compras del ítem" />
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TAMANO_DE_VER_MAS, { sustantivo: 'compras', articulo: 'las' })}
        />
      ) : null}
      {acciones}
    </div>
  )
}
