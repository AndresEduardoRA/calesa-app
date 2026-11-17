'use client'

import { ImageIcon } from 'lucide-react'
import { MOTIVO_NINGUN_TIPO_PARA_COMPARTIR } from '../../../../../entities/compartir-tipos-cambio'
import type { ImagenParaCompartir, Parte } from '../../../hooks/use-para-compartir'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { Textarea } from '@/shared/ui/textarea'

type Props = {
  imagen: Parte<ImagenParaCompartir>
  texto: Parte<string>
  reintentarImagen: () => void
  reintentarTexto: () => void
}

function ErrorConReintentar({
  titulo,
  mensaje,
  alReintentar,
}: {
  titulo: string
  mensaje: string
  alReintentar: () => void
}) {
  return (
    <div
      role="alert"
      className="grid justify-items-start gap-2 rounded-(--radius-md) border border-(--color-line) p-3 text-(length:--text-sm)"
    >
      <p className="font-medium text-(--color-ink)">{titulo}</p>
      <p className="text-(--color-ink-soft)">{mensaje}</p>
      <Button type="button" variant="outline" className="h-11 md:h-8" onClick={alReintentar}>
        Reintentar
      </Button>
    </div>
  )
}

// La imagen y el texto tal como saldrán. Cada uno falla por su lado: si la imagen no se arma, el texto sigue ahí (y se puede copiar o compartir).
export function VistaPrevia({ imagen, texto, reintentarImagen, reintentarTexto }: Props) {
  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid min-w-0 gap-1">
        <p className="text-(length:--text-sm) font-medium text-(--color-ink)">Imagen</p>
        {imagen.estado === 'sin_elegir' ? (
          <div className="grid h-24 place-items-center gap-1 rounded-(--radius-md) border border-dashed border-(--color-line) text-(length:--text-sm) text-(--color-ink-soft)">
            <ImageIcon aria-hidden className="size-5" />
            {MOTIVO_NINGUN_TIPO_PARA_COMPARTIR}
          </div>
        ) : null}
        {imagen.estado === 'leyendo' ? (
          <Skeleton aria-busy="true" aria-label="Armando la imagen" className="h-40 w-full" />
        ) : null}
        {imagen.estado === 'error' ? (
          <ErrorConReintentar
            titulo="No se pudo armar la imagen."
            mensaje={imagen.mensaje}
            alReintentar={reintentarImagen}
          />
        ) : null}
        {imagen.estado === 'listo' ? (
          // eslint-disable-next-line @next/next/no-img-element -- una imagen armada ahora (blob:): next/image no la optimiza.
          <img
            data-vista-previa-imagen=""
            src={imagen.dato.url}
            alt="Vista previa de la imagen que se comparte"
            className="max-h-72 w-full rounded-(--radius-md) border border-(--color-line) object-contain"
          />
        ) : null}
      </div>
      <div className="grid min-w-0 gap-1">
        <label
          htmlFor="compartir-texto"
          className="text-(length:--text-sm) font-medium text-(--color-ink)"
        >
          Texto
        </label>
        {texto.estado === 'error' ? (
          <ErrorConReintentar
            titulo="No se pudo armar el texto."
            mensaje={texto.mensaje}
            alReintentar={reintentarTexto}
          />
        ) : (
          <Textarea
            id="compartir-texto"
            readOnly
            rows={6}
            aria-busy={texto.estado === 'leyendo'}
            value={
              texto.estado === 'listo'
                ? texto.dato
                : texto.estado === 'leyendo'
                  ? 'Armando el texto…'
                  : MOTIVO_NINGUN_TIPO_PARA_COMPARTIR
            }
            className="resize-none text-(length:--text-sm)"
          />
        )}
      </div>
    </div>
  )
}
