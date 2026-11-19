'use client'

import type { KeyboardEvent, RefObject } from 'react'
import {
  BOTON_DEL_LADO_BLOQUEADO,
  BOTON_DEL_PORCENTAJE,
  BOTON_DEL_PORCENTAJE_BLOQUEADO,
  BOTON_DEL_VALOR,
} from './clases'
import { ID_DEL_ATAJO } from './simbolos-de-xcell'
import { TextoDeValor } from './texto-de-valor'
import type { DatosDeLado, Lado } from './use-edicion'

type Props = {
  lado: Lado
  datos: DatosDeLado
  moneda: string | undefined
  // Los ids que lo nombran: la etiqueta de la celda y él mismo.
  idDelBoton: string
  idDeLaEtiqueta: string
  // Las notas que lo describen (el aviso o el error, y su candado), separadas por espacio.
  idDeLaNota: string | undefined
  bloqueada: boolean
  // Bloqueado sólo este lado del par: la caja lleva el borde discontinuo (con la celda entera bloqueada lo lleva la celda).
  soloEsteLado: boolean
  conAtajo: boolean
  // Al cerrar con Enter o Esc este botón se monta de nuevo y, si es el lado marcado, recibe el foco una vez.
  volverARef: RefObject<Lado | null>
  principalRef: RefObject<HTMLElement | null>
  alAbrir: (lado: Lado) => void
  alTeclear: (lado: Lado, evento: KeyboardEvent<HTMLButtonElement>) => void
  // Lo que mide el botón al abrirse la edición: la entrada toma ese ancho y abrir no mueve nada.
  alMedir: (ancho: number) => void
}

// El monto, en la monoespaciada y en semibold; el porcentaje de un par, chico y gris (`clases.ts`).
const claseDelBoton = (lado: Lado, soloEsteLado: boolean) =>
  lado === 'principal'
    ? soloEsteLado
      ? BOTON_DEL_LADO_BLOQUEADO
      : BOTON_DEL_VALOR
    : soloEsteLado
      ? BOTON_DEL_PORCENTAJE_BLOQUEADO
      : BOTON_DEL_PORCENTAJE

// El valor de un lado de la celda cuando no se edita. Deshabilitado es `aria-disabled`, no `disabled`: se alcanza con Tab y se lee.
export function BotonDelValor(props: Props) {
  const { lado, datos, moneda, idDelBoton, idDeLaEtiqueta, idDeLaNota, bloqueada, conAtajo } = props
  const { volverARef, principalRef, alAbrir, alTeclear } = props
  return (
    <button
      id={idDelBoton}
      type="button"
      data-parada={lado === 'principal' ? 0 : 1}
      className={claseDelBoton(lado, props.soloEsteLado)}
      aria-labelledby={`${idDeLaEtiqueta} ${idDelBoton}`}
      aria-describedby={
        conAtajo
          ? idDeLaNota === undefined
            ? ID_DEL_ATAJO
            : `${idDeLaNota} ${ID_DEL_ATAJO}`
          : idDeLaNota
      }
      aria-disabled={bloqueada || undefined}
      aria-keyshortcuts={conAtajo ? 'ArrowRight' : undefined}
      ref={(elemento) => {
        if (lado === 'principal') {
          principalRef.current = elemento
        }
        if (elemento && volverARef.current === lado) {
          volverARef.current = null
          elemento.focus()
        }
      }}
      onClick={(evento) => {
        props.alMedir(evento.currentTarget.offsetWidth)
        alAbrir(lado)
      }}
      onKeyDown={(evento) => {
        props.alMedir(evento.currentTarget.offsetWidth)
        alTeclear(lado, evento)
      }}
    >
      <TextoDeValor
        valor={datos.valor}
        formato={datos.formato}
        moneda={moneda}
        decimales={datos.decimales}
      />
    </button>
  )
}
