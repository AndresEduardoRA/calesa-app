'use client'

import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { CeldaDeHoja, SeccionDeHoja } from '../../../entities/hoja'
import {
  ayudaDeTexto,
  celdaConAyuda,
  enlacesDeLaAyuda,
} from '../../../entities/presentacion-de-la-hoja'
import type { AyudaAbierta } from '../hooks/use-ayuda-de-la-hoja'
import { botonDeAyuda } from './boton-de-ayuda'

type Props = {
  // Las secciones donde se busca la celda que nombra la URL: la ayuda de una celda del modal se abre dentro del modal, la de la hoja en la hoja.
  secciones: readonly SeccionDeHoja[]
  contexto: ContextoDeHoja
  ayuda: AyudaAbierta
}

// Los enlaces de la ayuda (hasta 5, `https://`), como las tarjetas de enlace de V1: cada uno abre en otra pestaña, sin darle acceso a esta página (`noopener`) ni
// decirle de dónde viene (`noreferrer`), y su nombre accesible lo dice.
function EnlacesDeLaAyuda({ celda }: { celda: CeldaDeHoja }) {
  const enlaces = enlacesDeLaAyuda(celda)
  if (enlaces.length === 0) {
    return null
  }
  return (
    <section aria-labelledby="fuentes-de-la-ayuda" className="grid gap-2">
      <h3
        id="fuentes-de-la-ayuda"
        className="text-(length:--text-sm) font-medium text-(--color-ink)"
      >
        Consulta estas fuentes
      </h3>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {enlaces.map((enlace) => (
          <li key={enlace.url} className="min-w-0">
            <a
              href={enlace.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2 text-(length:--text-sm) font-medium break-words text-(--color-primario) transition hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none"
            >
              <span className="min-w-0">
                {enlace.titulo}
                <span className="sr-only"> (abre en otra pestaña)</span>
              </span>
              <ExternalLink aria-hidden className="size-4 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

// La ayuda de texto de una celda (paso 4.13-4a): un panel de sólo lectura con el texto del diseño y, si los trae, sus enlaces, con su URL. Si la URL nombra una celda que estas secciones no dibujan o que
// no tiene ayuda de texto, no abre nada. Al cerrar, el foco vuelve al botón de ayuda de su celda, también si se abrió por la URL.
export function AyudaDeCelda({ secciones, contexto, ayuda }: Props) {
  const celda = celdaConAyuda(secciones, ayuda.nodo, 'texto', contexto)
  // La celda se recuerda mientras el panel se va: sin ella se vaciaría a media animación.
  const [ultima, setUltima] = useState<CeldaDeHoja | null>(null)
  if (celda !== null && celda !== ultima) {
    setUltima(celda)
  }
  const mostrada = celda ?? ultima
  if (mostrada === null) {
    return null
  }
  return (
    <Drawer
      abierto={celda !== null}
      alCerrar={ayuda.cerrar}
      titulo={`Ayuda de ${mostrada.etiqueta}`}
      focoAlCerrar={() => botonDeAyuda(mostrada)}
    >
      <div className="grid gap-5">
        <p className="text-(length:--text-base) break-words whitespace-pre-line text-(--color-ink)">
          {ayudaDeTexto(mostrada)}
        </p>
        <EnlacesDeLaAyuda celda={mostrada} />
      </div>
    </Drawer>
  )
}
