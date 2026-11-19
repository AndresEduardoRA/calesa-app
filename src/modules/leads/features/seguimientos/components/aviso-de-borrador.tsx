'use client'

import { useSyncExternalStore, type RefObject } from 'react'
import { leerBorradorDeEstado } from '@/shared/lib/borrador'
import { Button } from '@/shared/ui/button'
import {
  claveDelBorradorDeSeguimiento,
  MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO,
} from '../../../entities/edicion-de-seguimiento'

const sinSuscripcion = () => () => undefined

// ¿Quedó algo escrito sin guardar al anotar? (se cerró con «atrás», o se recargó y no se reabrió). El
// servidor no tiene el almacenamiento de la pestaña: allá es «no».
export function useHayBorrador(leadId: string): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => {
      try {
        return (
          leerBorradorDeEstado(
            window.sessionStorage,
            claveDelBorradorDeSeguimiento(leadId, null),
          ) !== null
        )
      } catch {
        return false
      }
    },
    () => false,
  )
}

type Props = {
  boton: RefObject<HTMLButtonElement | null>
  sinTipos: boolean
  conBorrador: boolean
  // En el bloque de la ficha anotar está en el «+» del título: acá sólo el aviso del borrador.
  soloBorrador?: boolean
  alAbrir: () => void
}

// «Anotar seguimiento» o, con un borrador, «Tienes un seguimiento sin guardar.» con «Continuar»: no se abre solo. Sin tipos activos, el
// botón se apaga y dice por qué.
export function AnotarOContinuar({
  boton,
  sinTipos,
  conBorrador,
  soloBorrador = false,
  alAbrir,
}: Props) {
  if (conBorrador && !sinTipos) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-1.5">
        <p className="min-w-0 grow text-(length:--text-sm) text-(--color-ink)">
          Tienes un seguimiento sin guardar.
        </p>
        <Button
          ref={boton}
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-8"
          onClick={alAbrir}
        >
          Continuar
        </Button>
      </div>
    )
  }
  if (soloBorrador) {
    return null
  }
  return (
    <div className="grid gap-1">
      <Button
        ref={boton}
        type="button"
        className="min-h-11 w-fit md:min-h-9"
        onClick={alAbrir}
        disabled={sinTipos}
        aria-describedby={sinTipos ? 'seguimiento-sin-tipos' : undefined}
      >
        Anotar seguimiento
      </Button>
      {sinTipos ? (
        <p id="seguimiento-sin-tipos" className="text-(length:--text-sm) text-(--color-ink-faint)">
          {MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO}
        </p>
      ) : null}
    </div>
  )
}
