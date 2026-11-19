'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import { Skeleton } from '../skeleton'
import { EscenarioDelCarrusel } from './carrusel-en-el-lugar'
import { TiraDeMiniaturas } from './tira-de-miniaturas'
import { useCarrusel, type PedidoDelCarrusel } from './use-carrusel'
import { VisorDeImagenes } from './visor-de-imagenes'

type Props = PedidoDelCarrusel & {
  vacio: ReactNode
  // La caja de la foto (proporción, alto, fondo).
  className?: string
  // Lo que va encima de la foto (el «⋯» y la vitrina de la ficha), posicionado por quien lo pasa.
  sobreLaFoto?: ReactNode
}

// El carrusel de una ficha con su tira de miniaturas debajo (docs/GLOSARIO.md › «Tira de miniaturas»): las imágenes se piden al montarse (una sola
// lectura, miniaturas de 480 px; la grande sólo en el visor). Un clic en una miniatura abre el visor de siempre (`?visor=<clave>&foto=n`) en ella;
// con el foco en la tira, ← → la recorren y cambian la foto del lugar, y Enter la abre. Mientras lee, el alto de la tira queda reservado (el título
// no salta); con una sola foto o sin fotos, no hay tira.
export function CarruselConTira({ vacio, className, sobreLaFoto, ...pedido }: Props) {
  const c = useCarrusel(pedido, { alMontar: true })
  const leyendo =
    pedido.portada !== null && (c.estado.estado === 'leyendo' || c.estado.estado === 'sin_pedir')
  return (
    <div className="grid min-w-0 gap-2">
      <div className="relative min-w-0">
        <EscenarioDelCarrusel
          c={c}
          titulo={pedido.titulo}
          vacio={vacio}
          conPuntos={false}
          className={cn('w-full', className)}
        />
        {sobreLaFoto}
      </div>
      {c.imagenes !== null ? (
        <TiraDeMiniaturas
          imagenes={c.imagenes}
          actual={c.indice}
          etiqueta={`Fotos de ${pedido.titulo}`}
          conTeclado
          alMarcar={c.irA}
          alElegir={c.abrirEn}
        />
      ) : leyendo ? (
        <Skeleton aria-hidden className="h-14 w-full rounded-(--radius-sm)" />
      ) : null}
      {c.montarVisor ? <VisorDeImagenes titulo={pedido.titulo} {...c.visor} /> : null}
    </div>
  )
}
