'use client'

import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import {
  MAXIMO_DE_ENLACES,
  MAXIMO_DE_LA_URL_DEL_ENLACE,
  type EnlaceDeAyuda,
} from '../../../entities/diseno'
import { rechazoDelEnlace } from '../../../entities/diseno/edicion-de-items'

// Lo que el editor hace con los enlaces de la ayuda de una celda.
export type AccionesDeLosEnlaces = {
  sumar: () => void
  poner: (posicion: number, cambios: Partial<EnlaceDeAyuda>) => void
  quitar: (posicion: number) => void
}

type Props = {
  base: string
  enlaces: readonly EnlaceDeAyuda[]
  // Sin texto no hay ayuda a la que sumarle un enlace.
  hayTexto: boolean
  ocupado: boolean
  acciones: AccionesDeLosEnlaces
}

export const HASTA_CINCO_ENLACES = `Hasta ${String(MAXIMO_DE_ENLACES)} enlaces.`
export const PRIMERO_EL_TEXTO = 'Escribe primero el texto de la ayuda.'

// Un enlace: su título y su URL, cada uno con lo que se rechaza al tipear, y «Quitar».
function EnlaceEditable({
  nombre,
  numero,
  enlace,
  ocupado,
  alPoner,
  alQuitar,
}: {
  nombre: string
  numero: number
  enlace: EnlaceDeAyuda
  ocupado: boolean
  alPoner: (cambios: Partial<EnlaceDeAyuda>) => void
  alQuitar: () => void
}) {
  const rechazo = rechazoDelEnlace(enlace)
  return (
    <li
      data-enlace-de-la-ayuda=""
      className="grid min-w-0 gap-2 rounded-(--radius-md) border border-(--color-line) p-2 @md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] @md:items-start"
    >
      <Campo
        nombre={`${nombre}-titulo`}
        etiqueta={`Título del enlace ${String(numero)}`}
        value={enlace.titulo}
        disabled={ocupado}
        {...(rechazo.titulo ? { error: rechazo.titulo } : {})}
        onChange={(evento) => {
          alPoner({ titulo: evento.target.value })
        }}
      />
      <Campo
        nombre={`${nombre}-url`}
        etiqueta={`Dirección del enlace ${String(numero)}`}
        type="url"
        inputMode="url"
        placeholder="https://"
        maxLength={MAXIMO_DE_LA_URL_DEL_ENLACE}
        value={enlace.url}
        disabled={ocupado}
        {...(rechazo.url ? { error: rechazo.url } : {})}
        onChange={(evento) => {
          alPoner({ url: evento.target.value })
        }}
      />
      <Button
        variant="ghost"
        className="min-h-11 md:min-h-9 @md:mt-6"
        disabled={ocupado}
        aria-label={`Quitar el enlace ${String(numero)}`}
        onClick={alQuitar}
      >
        Quitar
      </Button>
    </li>
  )
}

// Los enlaces de la ayuda de texto de una celda (hasta 5): título y URL validados al tipear (el espejo de lo que rechaza la base), «Quitar» cada uno y «Agregar
// enlace», apagado con su motivo.
export function CamposDeLosEnlaces({ base, enlaces, hayTexto, ocupado, acciones }: Props) {
  const motivo = !hayTexto
    ? PRIMERO_EL_TEXTO
    : enlaces.length >= MAXIMO_DE_ENLACES
      ? HASTA_CINCO_ENLACES
      : null
  return (
    <div className="grid min-w-0 gap-2 @md:col-span-2">
      {enlaces.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {enlaces.map((enlace, i) => (
            <EnlaceEditable
              key={`${base}-enlace-${String(i)}`}
              nombre={`${base}-enlace-${String(i)}`}
              numero={i + 1}
              enlace={enlace}
              ocupado={ocupado}
              alPoner={(cambios) => {
                acciones.poner(i, cambios)
              }}
              alQuitar={() => {
                acciones.quitar(i)
              }}
            />
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={ocupado || motivo !== null}
          aria-describedby={motivo === null ? undefined : `${base}-motivo-del-enlace`}
          onClick={acciones.sumar}
        >
          Agregar enlace
        </Button>
        {motivo === null ? null : (
          <p
            id={`${base}-motivo-del-enlace`}
            className="text-(length:--text-sm) text-(--color-ink-soft)"
          >
            {motivo}
          </p>
        )}
      </div>
    </div>
  )
}
