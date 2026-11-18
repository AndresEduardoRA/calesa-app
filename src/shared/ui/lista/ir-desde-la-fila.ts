import type { MouseEvent } from 'react'
import {
  ATRIBUTO_DEL_ENLACE_DE_LA_FILA,
  abreEnOtraPestana,
  esClicDelEnlace,
  esClicPropio,
  hayTextoElegidoEn,
} from '@/shared/lib/clic-de-fila'

// Qué hace un clic en una fila o una tarjeta: abrir su resumen (`alAbrir`, una lista con resumen) o ir a su ficha (`href`, una lista sin
// resumen, con `<EnlaceDeLaFila>` en el nombre). Sin ninguno (la lista del equipo) la fila no promete un clic.
export type DestinoDeLaFila =
  { alAbrir?: () => void; href?: never } | { href: string; alAbrir?: never }

type Manejadores = {
  onClick?: (evento: MouseEvent<HTMLElement>) => void
  onAuxClick?: (evento: MouseEvent<HTMLElement>) => void
  onMouseDown?: (evento: MouseEvent<HTMLElement>) => void
}

// Un clic que la fila no toma: el de lo que tiene adentro (`esClicPropio`), el del enlace del nombre (navega solo) y el que termina de elegir
// texto (copiar el VIN).
function loIgnora(evento: MouseEvent<HTMLElement>): boolean {
  return (
    esClicDelEnlace(evento) ||
    esClicPropio(evento) ||
    hayTextoElegidoEn(evento.currentTarget, window.getSelection())
  )
}

function abrirEnOtraPestana(href: string) {
  window.open(href, '_blank', 'noopener')
}

// Un clic simple navega como el enlace del nombre: se le pasa el clic (`next/link` hace la navegación de la app, sin recargar), así la fila no
// necesita el router ni repite lo que el enlace ya sabe. Sin enlace (no debería pasar), la navegación del navegador.
function irComoElEnlace(fila: HTMLElement, href: string) {
  const enlace = fila.querySelector<HTMLElement>(`[${ATRIBUTO_DEL_ENLACE_DE_LA_FILA}]`)
  if (enlace) {
    enlace.click()
  } else {
    window.location.assign(href)
  }
}

// Los manejadores del clic de una fila o una tarjeta. Con `alAbrir`, lo de siempre: abre salvo lo propio. Con `href`, la fila se porta como un
// enlace: clic simple navega; Ctrl, Cmd o Shift + clic y el botón del medio abren otra pestaña; el botón del medio no arranca el desplazamiento
// automático.
export function manejadoresDelClic(destino: DestinoDeLaFila): Manejadores {
  const { alAbrir, href } = destino
  if (href !== undefined) {
    return {
      onClick: (evento) => {
        if (loIgnora(evento)) return
        if (abreEnOtraPestana(evento)) {
          evento.preventDefault()
          abrirEnOtraPestana(href)
          return
        }
        irComoElEnlace(evento.currentTarget, href)
      },
      onAuxClick: (evento) => {
        if (evento.button !== 1 || loIgnora(evento)) return
        evento.preventDefault()
        abrirEnOtraPestana(href)
      },
      onMouseDown: (evento) => {
        if (evento.button === 1 && !esClicDelEnlace(evento) && !esClicPropio(evento)) {
          evento.preventDefault()
        }
      },
    }
  }
  if (alAbrir !== undefined) {
    return {
      onClick: (evento) => {
        if (!esClicPropio(evento)) {
          alAbrir()
        }
      },
    }
  }
  return {}
}
