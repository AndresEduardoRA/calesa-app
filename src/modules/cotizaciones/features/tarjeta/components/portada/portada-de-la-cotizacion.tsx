'use client'

import Image from 'next/image'
import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useLive } from '@/shared/ui/live'
import { CLAVE_DEL_VISOR } from '@/shared/ui/visor-de-imagenes'
import { rutaDeLaPortada, type AnchoDeLaPortada } from '../../../../entities/ruta-de-la-hoja'
import { VisorDeLaPortadaDiferido } from './diferidos'
import { RecuadroDeLaPortada } from './recuadro-de-la-portada'

// La proporción de la tarjeta de V1 (960 × 512): la del marco si quien la usa no da otra.
export const PROPORCION_DE_LA_PORTADA = 15 / 8

export type PropsDeLaPortada = {
  cotizacionId: string
  // Para el texto alternativo y el título del visor.
  numero: number
  // El del recuadro mientras se arma o carga, o si falla; sin él, sólo el texto.
  total: { valor: number; moneda?: string | null } | null
  // Ancho ÷ alto del marco.
  proporcion?: number
  // La miniatura (las listas: 480 px); sin él, la grande. El visor pide siempre la grande.
  ancho?: AnchoDeLaPortada
  // Cómo va la imagen en el marco: entera (`contener`, por defecto) o llenándolo desde arriba a la izquierda (`cubrir`: la tarjeta de la lista; una portada de la
  // proporción del marco no se recorta, una más alta conserva su cabecera y una más ancha, el título y la columna de conceptos).
  recorte?: 'contener' | 'cubrir'
  // Dónde se dibuja: el visor vive en `?visor=` con una clave por lugar (`portada-<id>` en el resumen, `portada-de-la-lista-<id>` en la tarjeta de la lista), así la
  // tarjeta y el resumen abierto de la misma cotización no abren dos visores.
  lugar?: 'resumen' | 'lista'
}

type Carga = 'cargando' | 'lista' | 'fallo'

// «Reintentar» pide otra URL (la anterior quedó fallida en el navegador).
const conIntento = (ruta: string, intento: number): string =>
  intento === 0 ? ruta : `${ruta}${ruta.includes('?') ? '&' : '?'}intento=${String(intento)}`

// La clave del visor en `?visor=`, una por lugar: la tarjeta de la lista y el resumen abierto de la misma cotización no abren dos.
const claveDelVisor = (id: string, lugar: 'resumen' | 'lista'): string =>
  lugar === 'lista' ? `portada-de-la-lista-${id}` : `portada-${id}`

// La imagen (la miniatura, si se pidió un ancho) y la del visor (siempre la grande).
const urlsDeLaPortada = (id: string, ancho: AnchoDeLaPortada | undefined, intento: number) => ({
  url: conIntento(rutaDeLaPortada(id, ancho === undefined ? {} : { ancho }), intento),
  urlDelVisor: conIntento(rutaDeLaPortada(id), intento),
})

// La portada de la cotización (`docs/COTIZADOR.md` › «La portada de la cotización»): la imagen de su tarjeta, pedida a su ruta con `loading="lazy"` (la miniatura de
// una lista pide la misma: es una por cotización). Mientras llega o si falla, el recuadro con el total en el mismo marco, que crece si el texto no cabe. El clic la
// abre en el visor de fotos (su código llega al primer clic). En Modo Live, borrosa con «Oculto en Modo Live» y sin visor: lo hace el CSS de `globals.css`
// (`data-portada-imagen`, `data-portada-oculta`) antes de hidratar, y `useLive()` corta el clic.
export function PortadaDeLaCotizacion({
  cotizacionId,
  numero,
  total,
  proporcion = PROPORCION_DE_LA_PORTADA,
  ancho,
  recorte = 'contener',
  lugar = 'resumen',
}: PropsDeLaPortada) {
  const { live } = useLive()
  const [carga, setCarga] = useState<Carga>('cargando')
  const [intento, setIntento] = useState(0)
  const [pedidos, setPedidos] = useState(0)
  const [enLaUrl] = useQueryState(CLAVE_DEL_VISOR, parseAsString)
  const clave = claveDelVisor(cotizacionId, lugar)
  const montarVisor = useAbiertoAlgunaVez(!live && (pedidos > 0 || enLaUrl === clave))
  const { url, urlDelVisor } = urlsDeLaPortada(cotizacionId, ancho, intento)
  const texto = `Vista previa de la cotización n.º ${String(numero)}`
  const lista = carga === 'lista'

  return (
    <div
      data-portada
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
          data-portada-imagen
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
          data-portada-oculta
          className="pointer-events-none absolute inset-0 items-center justify-center p-4 text-center text-(length:--text-sm) font-medium text-(--color-ink)"
        >
          Oculto en Modo Live
        </p>
      ) : (
        <RecuadroDeLaPortada
          total={total}
          fallo={carga === 'fallo'}
          alReintentar={() => {
            setCarga('cargando')
            setIntento((n) => n + 1)
          }}
        />
      )}
      {montarVisor ? (
        <VisorDeLaPortadaDiferido
          clave={clave}
          titulo={texto}
          url={urlDelVisor}
          pedidos={pedidos}
        />
      ) : null}
    </div>
  )
}
