'use client'

import Image from 'next/image'
import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useLive } from '@/shared/ui/live'
import { CLAVE_DEL_VISOR } from '@/shared/ui/visor-de-imagenes'
import { rutaDeLaImagen, type AnchoDeLaImagen } from '../../../../entities/ruta-de-la-hoja'
import {
  claveDelVisorDeLaImagen,
  esClaveDelVisorDeLaImagen,
  type LugarDeLaImagen,
} from '../../../../entities/tarjeta/clave-del-visor-de-la-imagen'
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
}

type Carga = 'cargando' | 'lista' | 'fallo'

// La imagen (la miniatura, si se pidió un ancho) y la del visor (siempre la grande). «Reintentar» suma `?intento=`: otra URL (la anterior quedó fallida en el navegador).
const urlsDeLaImagen = (id: string, ancho: AnchoDeLaImagen | undefined, intento: number) => ({
  url: rutaDeLaImagen(id, ancho === undefined ? { intento } : { ancho, intento }),
  urlDelVisor: rutaDeLaImagen(id, { intento }),
})

// La imagen de la tarjeta (`docs/COTIZADOR.md` › «La imagen de la tarjeta»), pedida a su ruta con `loading="lazy"` (la miniatura de una lista pide la misma: es una
// por cotización y por quien mira). Mientras llega o si falla, el recuadro con el total en el mismo marco, que crece si el texto no cabe. El clic la abre en el visor
// de fotos (su código llega al primer clic; un enlace con la clave de antes, `portada-…`, también lo abre). En Modo Live, borrosa con «Oculto en Modo Live» y sin
// visor: lo hace el CSS de `globals.css` (`data-imagen`, `data-imagen-oculta`) antes de hidratar, y `useLive()` corta el clic.
export function ImagenDeLaTarjeta({
  cotizacionId,
  numero,
  total,
  proporcion = PROPORCION_DE_LA_IMAGEN,
  ancho,
  recorte = 'contener',
  lugar = 'resumen',
}: PropsDeLaImagen) {
  const { live } = useLive()
  const [carga, setCarga] = useState<Carga>('cargando')
  const [intento, setIntento] = useState(0)
  const [pedidos, setPedidos] = useState(0)
  const [enLaUrl] = useQueryState(CLAVE_DEL_VISOR, parseAsString)
  const laNombraLaUrl = esClaveDelVisorDeLaImagen(enLaUrl, cotizacionId, lugar)
  // Con la de la URL si la nombra (la de hoy o la de antes): el visor se abre con la clave que dice `?visor=`.
  const clave =
    laNombraLaUrl && enLaUrl !== null ? enLaUrl : claveDelVisorDeLaImagen(cotizacionId, lugar)
  const montarVisor = useAbiertoAlgunaVez(!live && (pedidos > 0 || laNombraLaUrl))
  const { url, urlDelVisor } = urlsDeLaImagen(cotizacionId, ancho, intento)
  const texto = `Imagen de la tarjeta de la cotización n.º ${String(numero)}`
  const lista = carga === 'lista'

  return (
    <div
      data-imagen-de-la-tarjeta
      className="relative grid w-full overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-paper-dim)"
      style={{ aspectRatio: String(proporcion) }}
    >
      <button
        type="button"
        aria-label={`Ver la ${texto.toLocaleLowerCase('es')} en grande`}
        disabled={live || !lista}
        onClick={() => {
          setPedidos((n) => n + 1)
        }}
        className="absolute inset-0 outline-none focus-visible:shadow-(--shadow-focus) enabled:cursor-zoom-in"
      >
        <Image
          key={url}
          src={url}
          alt={texto}
          fill
          unoptimized
          loading="lazy"
          sizes="(min-width: 48rem) 32rem, 100vw"
          className={recorte === 'cubrir' ? 'object-cover object-left-top' : 'object-contain'}
          data-imagen
          onLoad={() => {
            setCarga('lista')
          }}
          onError={() => {
            setCarga('fallo')
          }}
        />
      </button>
      {lista ? (
        <p
          data-imagen-oculta
          className="pointer-events-none absolute inset-0 items-center justify-center p-4 text-center text-(length:--text-sm) font-medium text-(--color-ink)"
        >
          Oculto en Modo Live
        </p>
      ) : (
        <RecuadroDeLaImagen
          total={total}
          fallo={carga === 'fallo'}
          alReintentar={() => {
            setCarga('cargando')
            setIntento((n) => n + 1)
          }}
        />
      )}
      {montarVisor ? (
        <VisorDeLaImagenDiferido clave={clave} titulo={texto} url={urlDelVisor} pedidos={pedidos} />
      ) : null}
    </div>
  )
}
