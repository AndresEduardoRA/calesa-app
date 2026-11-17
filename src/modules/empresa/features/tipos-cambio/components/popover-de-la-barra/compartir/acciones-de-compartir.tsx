'use client'

import { CopyIcon, DownloadIcon, ImageIcon, Share2Icon } from 'lucide-react'
import { useState } from 'react'
import { MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { Button } from '@/shared/ui/button'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { ImagenParaCompartir, Parte } from '../../../hooks/use-para-compartir'
import { motivosDeLasAcciones } from './motivos-de-las-acciones'
import {
  capacidadesDelNavegador,
  compartirConElSistema,
  copiarImagen,
  copiarTexto,
  descargarImagen,
} from './navegador'

type Props = {
  imagen: Parte<ImagenParaCompartir>
  texto: Parte<string>
  // Ninguna casilla marcada.
  sinElegir: boolean
}

const ID_DE_MOTIVOS = 'compartir-motivos'

const FALLO = { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO } as const

function Accion(props: {
  motivo: string | null
  etiqueta: string
  Icono: typeof CopyIcon
  principal?: boolean
  alHacer: () => void
}) {
  const { motivo, etiqueta, Icono, principal = false, alHacer } = props
  return (
    <Button
      type="button"
      variant={principal ? 'default' : 'outline'}
      className="h-11 md:h-9"
      disabled={motivo !== null}
      aria-describedby={motivo === null ? undefined : ID_DE_MOTIVOS}
      onClick={alHacer}
    >
      <Icono aria-hidden />
      {etiqueta}
    </Button>
  )
}

// Compartir (el menú del sistema, en el celular), copiar el texto, copiar la imagen (en el escritorio) y descargarla. Lo que el navegador no permite o
// lo que todavía no llegó se apaga y dice su motivo debajo; lo que falla al hacerlo se avisa y lo demás sigue disponible.
export function AccionesDeCompartir({ imagen, texto, sinElegir }: Props) {
  // Se arma tras abrir el popover, en el navegador (el contenido es diferido): no hay hidratación que desparejar.
  const [capacidades] = useState(capacidadesDelNavegador)
  const motivos = motivosDeLasAcciones(imagen, texto, sinElegir, capacidades)
  const elTexto = texto.estado === 'listo' ? texto.dato : null
  const laImagen = imagen.estado === 'listo' ? imagen.dato : null

  async function hacer(accion: () => Promise<void>, hecho: string) {
    try {
      await accion()
      avisarExito(hecho)
    } catch {
      avisarError(FALLO)
    }
  }

  async function compartir(textoAEnviar: string) {
    try {
      const resultado = await compartirConElSistema(textoAEnviar, laImagen?.blob ?? null)
      if (resultado !== null && laImagen !== null && !resultado.conImagen) {
        avisar('Se compartió el texto. Este navegador no comparte imágenes: descárgala.')
      }
    } catch {
      avisarError(FALLO)
    }
  }

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex flex-wrap gap-2">
        {capacidades.compartirDelSistema ? (
          <Accion
            principal
            motivo={motivos.compartir}
            etiqueta="Compartir"
            Icono={Share2Icon}
            alHacer={() => {
              if (elTexto !== null) {
                void compartir(elTexto)
              }
            }}
          />
        ) : null}
        <Accion
          motivo={motivos.copiarTexto}
          etiqueta="Copiar texto"
          Icono={CopyIcon}
          alHacer={() => {
            if (elTexto !== null) {
              void hacer(() => copiarTexto(elTexto), 'Texto copiado')
            }
          }}
        />
        {capacidades.compartirDelSistema ? null : (
          <Accion
            motivo={motivos.copiarImagen}
            etiqueta="Copiar imagen"
            Icono={ImageIcon}
            alHacer={() => {
              if (laImagen !== null) {
                void hacer(() => copiarImagen(laImagen.blob), 'Imagen copiada')
              }
            }}
          />
        )}
        <Accion
          motivo={motivos.descargar}
          etiqueta="Descargar"
          Icono={DownloadIcon}
          alHacer={() => {
            if (laImagen !== null) {
              descargarImagen(laImagen.url)
            }
          }}
        />
      </div>
      {motivos.aLaVista.length > 0 ? (
        <p id={ID_DE_MOTIVOS} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {motivos.aLaVista.join(' ')}
        </p>
      ) : null}
    </div>
  )
}
