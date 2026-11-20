'use client'

import Image from 'next/image'
import { useALaVista } from '@/shared/ui/use-a-la-vista'
import { useLive } from '@/shared/ui/live'
import { rutaDeLaImagen, type AnchoDeLaImagen } from '../../../../entities/ruta-de-la-hoja'
import type { LugarDeLaImagen } from '../../../../entities/tarjeta/clave-del-visor-de-la-imagen'
import { useCargaDeLaImagen } from '../../hooks/use-carga-de-la-imagen'
import { useVisorDeLaImagen } from '../../hooks/use-visor-de-la-imagen'
import { VisorDeLaImagenDiferido } from './diferidos'
import { RecuadroDeLaImagen } from './recuadro-de-la-imagen'

// La proporción de la tarjeta de V1 (960 × 512): la del marco si quien la usa no da otra.
export const PROPORCION_DE_LA_IMAGEN = 15 / 8

export type PropsDeLaImagen = {
  cotizacionId: string
  // Para el texto alternativo y el título del visor.
  numero: number
  // El del recuadro mientras se arma o carga, o si falla; sin él, sólo el texto.
  total: { valor: number; moneda?: string | null } | null
  // Ancho ÷ alto del marco.
  proporcion?: number
  // La miniatura (las listas: 480 px); sin él, la grande. El visor pide siempre la grande.
  ancho?: AnchoDeLaImagen
  // Cómo va la imagen en el marco: entera (`contener`, por defecto) o llenándolo desde arriba a la izquierda (`cubrir`: la tarjeta de la lista; una imagen de la
  // proporción del marco no se recorta, una más alta conserva su cabecera y una más ancha, el título y la columna de conceptos).
  recorte?: 'contener' | 'cubrir'
  // Dónde se dibuja: el visor vive en `?visor=` con una clave por lugar (`claveDelVisorDeLaImagen()`), así la tarjeta y el resumen abierto de la misma cotización
  // no abren dos visores.
  lugar?: LugarDeLaImagen
  // La miniatura de una cabecera (el resumen): su recuadro y su aviso de Modo Live en letra chica, sin crecer.
  miniatura?: boolean
}

// La imagen (la miniatura, si se pidió un ancho) y la del visor (siempre la grande). «Reintentar» suma `?intento=`: otra URL (la anterior quedó fallida en el navegador).
const urlsDeLaImagen = (id: string, ancho: AnchoDeLaImagen | undefined, intento: number) => ({
  url: rutaDeLaImagen(id, ancho === undefined ? { intento } : { ancho, intento }),
  urlDelVisor: rutaDeLaImagen(id, { intento }),
})

// La imagen de la tarjeta (`docs/COTIZADOR.md` › «La imagen de la tarjeta»), pedida a su ruta recién a la vista (200 px antes) y con turno en la cola de la página
// (`useCargaDeLaImagen()`: a lo sumo cuatro a la vez; la que sale de la vista antes de su turno deja la fila). Mientras espera, llega o si falla, el recuadro con el
// total en el mismo marco, que crece si el texto no cabe; con turno va `eager` (`lazy` podría no pedirla nunca si sale de la vista, y el turno quedaría tomado). El
// clic la abre en el visor de fotos (su código llega al primer clic; un enlace con la clave de antes, `portada-…`, también lo abre). En Modo Live, borrosa con
// «Oculto en Modo Live» y sin visor: lo hace el CSS de `globals.css` (`data-imagen`, `data-imagen-oculta`) antes de hidratar, y `useLive()` corta el clic.
export function ImagenDeLaTarjeta({
  cotizacionId,
  numero,
  total,
  proporcion = PROPORCION_DE_LA_IMAGEN,
  ancho,
  recorte = 'contener',
  lugar = 'resumen',
  miniatura = false,
}: PropsDeLaImagen) {
  const { live } = useLive()
  const [observar, aLaVista] = useALaVista<HTMLDivElement>({ seguir: true })
  const imagen = useCargaDeLaImagen(aLaVista)
  const visor = useVisorDeLaImagen({ cotizacionId, lugar, live })
  const { url, urlDelVisor } = urlsDeLaImagen(cotizacionId, ancho, imagen.intento)
  const texto = `Imagen de la tarjeta de la cotización n.º ${String(numero)}`
  const lista = imagen.carga === 'lista'

  return (
    <div
      ref={observar}
      data-imagen-de-la-tarjeta={cotizacionId}
      className="relative grid w-full overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-paper-dim)"
      style={{ aspectRatio: String(proporcion) }}
    >
      <button
        type="button"
        aria-label={`Ver la ${texto.toLocaleLowerCase('es')} en grande`}
        disabled={live || !lista}
        onClick={visor.abrir}
        className="absolute inset-0 outline-none focus-visible:shadow-(--shadow-focus) enabled:cursor-zoom-in"
      >
        {imagen.conTurno ? (
          <Image
            key={url}
            src={url}
            alt={texto}
            fill
            unoptimized
            loading="eager"
            sizes="(min-width: 48rem) 32rem, 100vw"
            className={recorte === 'cubrir' ? 'object-cover object-left-top' : 'object-contain'}
            data-imagen
            onLoad={imagen.alCargar}
            onError={imagen.alFallar}
          />
        ) : null}
      </button>
      {lista ? (
        <p
          data-imagen-oculta
          className={`pointer-events-none absolute inset-0 items-center justify-center text-center font-medium text-(--color-ink) ${
            miniatura ? 'p-1 text-(length:--text-xs)' : 'p-4 text-(length:--text-sm)'
          }`}
        >
          Oculto en Modo Live
        </p>
      ) : (
        <RecuadroDeLaImagen
          total={total}
          fallo={imagen.carga === 'fallo'}
          alReintentar={imagen.reintentar}
          miniatura={miniatura}
        />
      )}
      {visor.montar ? (
        <VisorDeLaImagenDiferido
          clave={visor.clave}
          titulo={texto}
          url={urlDelVisor}
          pedidos={visor.pedidos}
        />
      ) : null}
    </div>
  )
}
