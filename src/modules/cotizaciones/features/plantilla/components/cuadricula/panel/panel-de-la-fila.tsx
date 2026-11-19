'use client'

import {
  ALTO_DE_FILA,
  type OcultarSi,
  type PlantillaEnCuadricula,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import { nodosParaElegir } from '../../../../../entities/plantilla/edicion/datos-para-elegir'
import type { AccionDelEditor } from '../../../../../entities/plantilla/edicion/reductor'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { CampoDeNumero } from './campo-de-numero'
import { Eleccion } from './eleccion'
import { SeccionDelPanel } from './seccion-del-panel'

type Props = {
  plantilla: PlantillaEnCuadricula
  fila: number
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  hacer: (accion: AccionDelEditor) => void
}

const OCULTAR: readonly { valor: OcultarSi; texto: string }[] = [
  { valor: 'nunca', texto: 'Nunca' },
  { valor: 'no_aplica', texto: 'Si no aplica' },
  { valor: 'no_aplica_o_cero', texto: 'Si no aplica o vale 0' },
]

// Con una fila elegida: su alto (16 a 240 px) y «Ocultar si…» con el nodo que la decide (como T310: la fila no se dibuja si su nodo no aplica, o vale 0).
export function PanelDeLaFila({ plantilla, fila, contexto, nombrados, hacer }: Props) {
  const f = plantilla.filas[fila]
  if (f === undefined) return null
  const nodos = nodosParaElegir(contexto, nombrados).flatMap((g) => g.nodos)
  const nodo = f.nodo ?? null
  return (
    <div className="grid min-w-0 gap-4" data-panel-de-la-fila={f.id}>
      <p className="font-medium">Fila {fila + 1}</p>
      <SeccionDelPanel titulo="Alto">
        <CampoDeNumero
          etiqueta="Alto de la fila"
          valor={f.alto}
          minimo={ALTO_DE_FILA.minimo}
          maximo={ALTO_DE_FILA.maximo}
          alCambiar={(alto) => {
            hacer({ tipo: 'alto', fila, alto })
          }}
        />
      </SeccionDelPanel>
      <SeccionDelPanel titulo="Ocultar si…">
        <Eleccion
          etiqueta="Ocultar la fila"
          valor={f.ocultar_si}
          opciones={OCULTAR}
          alCambiar={(ocultar) => {
            hacer({
              tipo: 'ocultarSi',
              fila,
              ocultar,
              nodo: ocultar === 'nunca' ? null : (nodo ?? nodos[0]?.id ?? null),
            })
          }}
        />
        {f.ocultar_si === 'nunca' ? null : (
          <Eleccion
            etiqueta="El nodo que la decide"
            valor={nodo ?? ''}
            opciones={nodos.map((n) => ({
              valor: n.id,
              texto: n.restringido ? `${n.etiqueta} (restringido)` : n.etiqueta,
            }))}
            alCambiar={(elegido) => {
              hacer({ tipo: 'ocultarSi', fila, ocultar: f.ocultar_si, nodo: elegido })
            }}
          />
        )}
      </SeccionDelPanel>
    </div>
  )
}
