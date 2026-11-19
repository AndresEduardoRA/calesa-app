'use client'

import { CarFrontIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { TiraDeMiniaturas, useImagenes, type ImagenDelVisor } from '@/shared/ui/visor-de-imagenes'
import { useCargarFotos } from '../../../fotos/hooks/use-cargar-fotos'

const FLECHA =
  'absolute top-1/2 size-11 -translate-y-1/2 rounded-full bg-(--color-surface)/85 shadow-sm backdrop-blur-sm'

const MARCO = 'relative aspect-4/3 max-h-[60svh] w-full overflow-hidden rounded-(--radius-card)'

function Flecha({ paso, alMover }: { paso: 1 | -1; alMover: (paso: 1 | -1) => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={paso === 1 ? 'Foto siguiente' : 'Foto anterior'}
      className={cn(FLECHA, paso === 1 ? 'right-2' : 'left-2')}
      onClick={() => {
        alMover(paso)
      }}
    >
      {paso === 1 ? <ChevronRightIcon aria-hidden /> : <ChevronLeftIcon aria-hidden />}
    </Button>
  )
}

// La foto grande y la tira, con la foto elegida en estado local.
function Fotos({ imagenes, titulo }: { imagenes: readonly ImagenDelVisor[]; titulo: string }) {
  const [actual, setActual] = useState(0)
  const total = imagenes.length
  const foto = imagenes[Math.min(actual, total - 1)]
  const mover = (paso: 1 | -1) => {
    setActual((antes) => (antes + paso + total) % total)
  }
  return (
    <div className="grid min-w-0 gap-2">
      <div
        className={cn(MARCO, 'bg-(--color-paper-dim)')}
        onKeyDown={(evento) => {
          if (total < 2) return
          if (evento.key === 'ArrowRight') mover(1)
          else if (evento.key === 'ArrowLeft') mover(-1)
        }}
      >
        {foto ? (
          <Image
            key={foto.id}
            src={foto.grande}
            alt={`${titulo}, foto ${String(actual + 1)} de ${String(total)}`}
            fill
            unoptimized
            priority
            sizes="(min-width: 64rem) 60rem, 100vw"
            className="object-contain"
          />
        ) : null}
        {total > 1 ? (
          <>
            <Flecha paso={-1} alMover={mover} />
            <Flecha paso={1} alMover={mover} />
          </>
        ) : null}
      </div>
      <TiraDeMiniaturas
        imagenes={imagenes}
        actual={actual}
        etiqueta={`Fotos de ${titulo}`}
        conTeclado
        tamano="mediana"
        alMarcar={setActual}
        alElegir={setActual}
      />
    </div>
  )
}

// Las fotos de la ficha completa: la grande (sólo la actual, con `priority`) con flechas y ← →, y la tira debajo. La foto elegida es de acá (no toca
// `?visor=`): dentro del modal no se abre otro. Se leen al abrirse, con la misma lectura del carrusel de la ficha; un fallo se reintenta a mano.
export function GaleriaDeLaFichaCompleta({
  vehiculoId,
  titulo,
}: {
  vehiculoId: string
  titulo: string
}) {
  const { estado, imagenes, pedir } = useImagenes(useCargarFotos(vehiculoId))
  const pedida = useRef(false)
  useEffect(() => {
    if (pedida.current) return
    pedida.current = true
    pedir()
  }, [pedir])
  if (estado.estado === 'fallo') {
    return (
      <div
        role="alert"
        className={cn(
          MARCO,
          'flex flex-wrap items-center justify-center gap-2 bg-(--color-paper-dim) p-6',
        )}
      >
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar las fotos.
        </p>
        <Button type="button" variant="outline" className="min-h-11 md:min-h-9" onClick={pedir}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (imagenes === null) {
    return <Skeleton aria-label="Cargando las fotos" className={MARCO} />
  }
  if (imagenes.length === 0) {
    return (
      <div className={cn(MARCO, 'grid place-items-center bg-(--color-paper-dim)')}>
        <span className="grid justify-items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
          <CarFrontIcon aria-hidden className="size-8 text-(--color-ink-faint)" />
          No tiene fotos todavía.
        </span>
      </div>
    )
  }
  return <Fotos imagenes={imagenes} titulo={titulo} />
}
