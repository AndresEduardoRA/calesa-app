'use client'

import { createContext } from 'react'
import type { ContextoDeHoja } from '../../../../entities/binding'
import type { ParDeHoja } from '../../../../entities/hoja-en-par'
import type { AccionesDeHoja } from '../../hooks/use-hoja'

// Lo que una celda en par necesita de cada columna (glosario: «Variante en par»): lo tipeado y la respuesta de su opción, y sus acciones. Lo pone la hoja en par;
// sin él (la hoja de siempre), ninguna celda se dibuja en par.
export type ColumnaDelPar = { contexto: ContextoDeHoja; acciones: AccionesDeHoja }
export type HojaDelPar = { par: ParDeHoja; columnas: readonly [ColumnaDelPar, ColumnaDelPar] }

export const ContextoDelPar = createContext<HojaDelPar | null>(null)
