'use client'

import { useMemo } from 'react'
import type { Diseno } from '../../../entities/diseno'
import type { PorDefecto } from '../../../entities/cabecera-por-defecto'
import {
  ponerModo,
  ponerPorDefecto,
  ponerVerTotalBs,
  quitarModo,
  sumarModo,
  type CambioDeModo,
} from '../../../entities/diseno/edicion-de-la-cabecera'
import {
  alternarSecundario,
  ponerTotalDeLaTarjeta,
} from '../../../entities/diseno/edicion-de-la-tarjeta'
import {
  ponerAtajos,
  ponerAyuda,
  ponerEfecto,
  type AyudaDeCelda,
} from '../../../entities/diseno/edicion-de-items'
import {
  ponerAspectoDeItem,
  ponerAspectoDeLaCabecera,
  ponerAspectoDeSeccion,
  type CambioDeAspectoDeItem,
  type CambioDeAspectoDeLaCabecera,
  type CambioDeAspectoDeSeccion,
} from '../../../entities/diseno/edicion-del-aspecto'
import { moverItem, moverSeccion } from '../../../entities/diseno/orden-del-diseno'
import type { ItemDeDiseno } from '../../../entities/diseno'
import type { Definicion } from '../../../entities/formula'

export type EdicionesDelDiseno = ReturnType<typeof edicionesDelDiseno>

// Las operaciones puras de ítems, cabecera, tarjeta, aspecto y orden, atadas a `aplicar` del editor: ningún componente llama a una operación pura directo.
function edicionesDelDiseno(
  aplicar: (cambio: (d: Diseno) => Diseno) => void,
  definicion: Definicion,
) {
  return {
    ponerAtajos: (seccion: string, nodo: string, cambios: { columna?: string; filas?: number }) => {
      aplicar((d) => ponerAtajos(d, seccion, nodo, cambios))
    },
    ponerEfecto: (seccion: string, nodo: string, efecto: Parameters<typeof ponerEfecto>[3]) => {
      aplicar((d) => ponerEfecto(d, seccion, nodo, efecto))
    },
    ponerAyuda: (seccion: string, nodo: string, ayuda: AyudaDeCelda | null) => {
      aplicar((d) => ponerAyuda(d, seccion, nodo, ayuda))
    },
    ponerVerTotalBs: (valor: boolean) => {
      aplicar((d) => ponerVerTotalBs(d, valor))
    },
    ponerPorDefecto: (pd: PorDefecto) => {
      aplicar((d) => ponerPorDefecto(d, pd))
    },
    sumarModo: (nombre: string) => {
      aplicar((d) => sumarModo(definicion, d, nombre))
    },
    ponerModo: (clave: string, cambios: CambioDeModo) => {
      aplicar((d) => ponerModo(d, clave, cambios))
    },
    quitarModo: (clave: string) => {
      aplicar((d) => quitarModo(d, clave))
    },
    ponerTotal: (nodo: string) => {
      aplicar((d) => ponerTotalDeLaTarjeta(d, nodo))
    },
    alternarSecundario: (nodo: string) => {
      aplicar((d) => alternarSecundario(d, nodo))
    },
    ponerAspectoDeSeccion: (seccion: string, cambios: CambioDeAspectoDeSeccion) => {
      aplicar((d) => ponerAspectoDeSeccion(d, seccion, cambios))
    },
    ponerAspectoDeItem: (
      seccion: string,
      item: { tipo: ItemDeDiseno['tipo']; nodo: string },
      cambios: CambioDeAspectoDeItem,
    ) => {
      aplicar((d) => ponerAspectoDeItem(d, seccion, item, cambios))
    },
    ponerAspectoDeLaCabecera: (cambios: CambioDeAspectoDeLaCabecera) => {
      aplicar((d) => ponerAspectoDeLaCabecera(d, cambios))
    },
    moverSeccion: (desde: number, hasta: number) => {
      aplicar((d) => moverSeccion(d, desde, hasta))
    },
    moverItem: (seccion: string, desde: number, hasta: number) => {
      aplicar((d) => moverItem(d, seccion, desde, hasta))
    },
  }
}

export function useEdicionesDelDiseno(
  aplicar: (cambio: (d: Diseno) => Diseno) => void,
  definicion: Definicion,
) {
  return useMemo(() => edicionesDelDiseno(aplicar, definicion), [aplicar, definicion])
}
