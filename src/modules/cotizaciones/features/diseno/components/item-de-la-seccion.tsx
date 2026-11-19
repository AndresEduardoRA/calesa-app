'use client'

import type { AnchoDeCelda, SeccionDeDiseno } from '../../../entities/diseno'
import type { NodosPorId } from '../../../entities/diseno/admite-nivel'
import type { CambioDeAspectoDeItem } from '../../../entities/diseno/edicion-del-aspecto'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import { columnasParaAtajos, type AyudaDeCelda } from '../../../entities/diseno/edicion-de-items'
import type { CambioDeNiveles } from '../../../entities/diseno/niveles'
import type { EdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'
import { useFilaOrdenable } from '../hooks/use-fila-ordenable'
import type { ErrorDelAspecto } from './aspecto'
import type { AccionesDeLosEnlaces } from './campos-de-los-enlaces'
import { CeldaEditable } from './celda-editable'
import { ItemDeAtajos } from './item-de-atajos'
import { ItemDeInterruptor } from './item-de-interruptor'
import { ItemDeLectura } from './item-de-lectura'

type Props = {
  seccion: SeccionDeDiseno
  item: SeccionDeDiseno['items'][number]
  // El id de su fila en la lista que se ordena (único dentro de la sección).
  idDeLaFila: string
  etiqueta: string
  nodos: NodosPorId
  niveles: readonly NivelDelDiseno[]
  tablas: readonly string[]
  ediciones: EdicionesDelDiseno
  ocupado: boolean
  // El rechazo de forma del aspecto de este ítem, si es suyo.
  error: ErrorDelAspecto
  alPonerAncho: (nodo: string, ancho: AnchoDeCelda) => void
  alPonerNiveles: (nodo: string | undefined, cambios: CambioDeNiveles) => void
}

// La ayuda de la celda `nodo` y sus enlaces, atados a las ediciones del diseño.
function accionesDeLaAyuda(
  ediciones: EdicionesDelDiseno,
  seccion: string,
  nodo: string,
): { alPonerAyuda: (ayuda: AyudaDeCelda | null) => void; enlaces: AccionesDeLosEnlaces } {
  const enlaces: AccionesDeLosEnlaces = {
    sumar: () => {
      ediciones.sumarEnlace(seccion, nodo)
    },
    poner: (posicion, cambios) => {
      ediciones.ponerEnlace({ seccion, nodo, posicion }, cambios)
    },
    quitar: (posicion) => {
      ediciones.quitarEnlace({ seccion, nodo, posicion })
    },
  }
  return {
    alPonerAyuda: (ayuda) => {
      ediciones.ponerAyuda(seccion, nodo, ayuda)
    },
    enlaces,
  }
}

// Un ítem de la sección, según su tipo: la celda con su ancho, niveles y ayuda; los atajos y el interruptor con sus campos; la variante y el subtotal, de sólo
// lectura (no tienen más campo que su nodo). Todos se ordenan dentro de su sección y llevan su aspecto.
export function ItemDeLaSeccion({
  seccion,
  item,
  idDeLaFila,
  etiqueta,
  nodos,
  niveles,
  tablas,
  ediciones,
  ocupado,
  error,
  alPonerAncho,
  alPonerNiveles,
}: Props) {
  const fila = useFilaOrdenable(idDeLaFila, ocupado)
  const comun = {
    etiqueta,
    ocupado,
    fila,
    error,
    alPonerAspecto: (cambios: CambioDeAspectoDeItem) => {
      ediciones.ponerAspectoDeItem(seccion.id, { tipo: item.tipo, nodo: item.nodo }, cambios)
    },
  }
  switch (item.tipo) {
    case 'celda':
      return (
        <CeldaEditable
          seccion={seccion}
          celda={item}
          nodos={nodos}
          niveles={niveles}
          tablas={tablas}
          {...comun}
          alPonerAncho={(ancho) => {
            alPonerAncho(item.nodo, ancho)
          }}
          alPonerNiveles={(cambios) => {
            alPonerNiveles(item.nodo, cambios)
          }}
          {...accionesDeLaAyuda(ediciones, seccion.id, item.nodo)}
        />
      )
    case 'atajos':
      return (
        <ItemDeAtajos
          seccionId={seccion.id}
          item={item}
          columnas={columnasParaAtajos(nodos, item.nodo, item.columna)}
          {...comun}
          alPonerAtajos={(cambios) => {
            ediciones.ponerAtajos(seccion.id, item.nodo, cambios)
          }}
        />
      )
    case 'interruptor':
      return (
        <ItemDeInterruptor
          seccionId={seccion.id}
          item={item}
          {...comun}
          alPonerEfecto={(efecto) => {
            ediciones.ponerEfecto(seccion.id, item.nodo, efecto)
          }}
        />
      )
    case 'variante':
    case 'subtotal':
      return (
        <ItemDeLectura
          seccionId={seccion.id}
          item={item}
          definicion={nodos.get(item.nodo)}
          {...comun}
        />
      )
  }
}
