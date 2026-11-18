'use client'

import { CarFrontIcon, CheckIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { cn } from 'cn'
import { Skeleton } from '@/shared/ui/skeleton'
import type { FotoParaCompartir } from '../../../../entities/tarjeta/compartir/datos-para-compartir'
import type { ParteDeCompartir } from '../../hooks/use-parte-de-compartir'
import { ErrorConReintentar } from './error-con-reintentar'

type Props = {
  fotos: ParteDeCompartir<FotoParaCompartir[]>
  marcadas: ReadonlySet<string>
  alAlternar: (foto: FotoParaCompartir, numero: number) => void
  alReintentar: () => void
}

function Miniatura({ foto, numero }: { foto: FotoParaCompartir; numero: number }) {
  const [fallo, setFallo] = useState(false)
  if (fallo) {
    return (
      <span className="grid size-full place-items-center text-(--color-ink-faint)">
        <CarFrontIcon aria-hidden className="size-6" />
      </span>
    )
  }
  return (
    <Image
      src={foto.miniatura}
      alt={`Foto ${String(numero)}`}
      fill
      // Ya llega chica (480 px) desde Storage: el optimizador sólo sumaría otra descarga. Lo que no está a la vista no se pide.
      unoptimized
      loading="lazy"
      sizes="10rem"
      className="object-cover"
      onError={() => {
        setFallo(true)
      }}
    />
  )
}

// «Imagen › Fotos»: las fotos del vehículo (a lo sumo 24, en miniatura de 480 px) en una grilla que se parte sola; tocar una la marca o la desmarca. Cada una es una
// casilla (`role="checkbox"`) con la marca en una esquina de 44 px. Una miniatura que no carga deja el hueco con el auto y se puede marcar igual.
export function GrillaDeFotos({ fotos, marcadas, alAlternar, alReintentar }: Props) {
  if (fotos.estado === 'error') {
    return (
      <ErrorConReintentar
        titulo="No se pudieron leer las fotos."
        mensaje={fotos.error.mensaje}
        alReintentar={alReintentar}
      />
    )
  }
  if (fotos.estado !== 'listo') {
    return <Skeleton aria-busy="true" aria-label="Leyendo las fotos" className="h-32 w-full" />
  }
  return (
    <ul className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
      {fotos.dato.map((foto, i) => {
        const marcada = marcadas.has(foto.id)
        return (
          <li key={foto.id} className="min-w-0">
            <button
              type="button"
              role="checkbox"
              aria-checked={marcada}
              aria-label={`Foto ${String(i + 1)}`}
              data-foto-para-compartir=""
              onClick={() => {
                alAlternar(foto, i + 1)
              }}
              className={cn(
                'relative block aspect-4/3 w-full overflow-hidden rounded-(--radius-md) border bg-(--color-paper-dim) outline-none focus-visible:shadow-(--shadow-focus)',
                marcada
                  ? 'border-(--color-primario) ring-2 ring-(--color-primario)'
                  : 'border-(--color-line)',
              )}
            >
              <Miniatura foto={foto} numero={i + 1} />
              <span
                aria-hidden
                className="absolute top-0 right-0 grid size-[44px] place-items-center"
              >
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full border-2 border-white shadow',
                    marcada ? 'bg-(--color-primario) text-(--color-sobre-primario)' : 'bg-black/30',
                  )}
                >
                  {marcada ? <CheckIcon className="size-4" /> : null}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
