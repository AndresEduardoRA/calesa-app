'use client'

import { useState } from 'react'
import {
  BORDES,
  LADOS,
  type Borde,
  type EstiloDeLaCelda,
  type Lado,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import type { CambioDeEstilo } from '../../../../../entities/plantilla/edicion/estilo'
import { Eleccion } from './eleccion'
import { OpcionesEnFila } from './opciones-en-fila'

const NOMBRE_DEL_LADO: Readonly<Record<Lado | 'todos', string>> = {
  todos: 'Todos',
  arriba: 'Arriba',
  derecha: 'Derecha',
  abajo: 'Abajo',
  izquierda: 'Izquierda',
}
const NOMBRE_DEL_BORDE: Readonly<Record<Borde, string>> = {
  ninguno: 'Ninguno',
  fino: 'Fino',
  grueso: 'Grueso',
}

// El borde de un lado tal como se dibuja: el suyo, si no el de `todos`, si no ninguno (como `estiloDibujado()`).
const bordeDe = (bordes: EstiloDeLaCelda['bordes'], lado: Lado | 'todos'): Borde | null => {
  if (bordes === undefined) return 'ninguno'
  if (lado === 'todos') {
    const lados = LADOS.map((l) => bordes[l] ?? bordes.todos ?? 'ninguno')
    return lados.every((b) => b === lados[0]) ? (lados[0] ?? 'ninguno') : null
  }
  return bordes[lado] ?? bordes.todos ?? 'ninguno'
}

// «Bordes»: el lado (todos o uno) y su grosor (ninguno, fino o grueso).
export function CampoDeBordes({
  comun,
  alCambiar,
}: {
  comun: EstiloDeLaCelda
  alCambiar: (cambio: CambioDeEstilo) => void
}) {
  const [lado, setLado] = useState<Lado | 'todos'>('todos')
  return (
    <div className="grid min-w-0 gap-2">
      <Eleccion
        etiqueta="Lado"
        valor={lado}
        opciones={(['todos', ...LADOS] as const).map((l) => ({
          valor: l,
          texto: NOMBRE_DEL_LADO[l],
        }))}
        alCambiar={setLado}
      />
      <OpcionesEnFila
        etiqueta={`Borde: ${NOMBRE_DEL_LADO[lado].toLowerCase()}`}
        valor={bordeDe(comun.bordes, lado)}
        opciones={BORDES.map((b) => ({ valor: b, texto: NOMBRE_DEL_BORDE[b] }))}
        alElegir={(borde) => {
          alCambiar({ borde: { lado, borde } })
        }}
      />
    </div>
  )
}
