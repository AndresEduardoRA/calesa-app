'use client'

import { Fragment } from 'react'
import {
  cambiarEn,
  motivoParaQuitarCondicion,
  motivoParaSumarCondicion,
  quitarCondicion,
  sumarCondicion,
} from '../../../../../entities/plantilla/edicion/borradores-de-la-celda'
import type {
  CondicionEnBorrador,
  Motivos,
} from '../../../../../entities/plantilla/edicion/condiciones'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { BotonDeAgregar } from './boton-de-agregar'
import { CampoDeLaCondicion } from './campo-de-la-condicion'
import type { OperacionDelBloque } from './menu-del-bloque'

type Si = readonly CondicionEnBorrador[]

type Props = {
  si: Si
  // Su lugar en la regla: `si` (una fila) o `ramas.<j>.si`.
  lugar: string
  motivos: Motivos
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  clave: string
  alCambiar: (si: Si, clave?: string) => void
}

// «Quitar la condición N» para el «⋯» del bloque que las tiene (la rama o la fila); con una sola, apagado con su motivo.
export function operacionesDeLasCondiciones(
  si: Si,
  alCambiar: (si: Si) => void,
): OperacionDelBloque[] {
  if (si.length <= 1)
    return [
      { texto: 'Quitar la condición', motivo: motivoParaQuitarCondicion(si), alHacer: () => {} },
    ]
  return si.map((_, m) => ({
    texto: `Quitar la condición ${String(m + 1)}`,
    motivo: null,
    alHacer: () => {
      alCambiar(quitarCondicion(si, m))
    },
  }))
}

// Las condiciones de una rama o de una fila, unidas con «Y», y debajo «Y además…» (hasta 3).
export function ListaDeCondiciones({
  si,
  lugar,
  motivos,
  contexto,
  nombrados,
  clave,
  alCambiar,
}: Props) {
  return (
    <div className="grid min-w-0 gap-2">
      {si.map((c, m) => (
        // Las condiciones no tienen id propio: su lugar es su clave.
        <Fragment key={m}>
          {m === 0 ? null : (
            <p
              aria-hidden
              className="text-(length:--text-xs) font-semibold text-(--color-ink-soft)"
            >
              Y
            </p>
          )}
          <CampoDeLaCondicion
            lugar={`${lugar}.${String(m)}`}
            numero={m + 1}
            condicion={c}
            motivos={motivos}
            contexto={contexto}
            nombrados={nombrados}
            clave={`${clave}:${lugar}.${String(m)}`}
            alCambiar={(nueva, k) => {
              alCambiar(cambiarEn(si, m, nueva), k)
            }}
          />
        </Fragment>
      ))}
      <BotonDeAgregar
        texto="Y además…"
        motivo={motivoParaSumarCondicion(si)}
        alAgregar={() => {
          alCambiar(sumarCondicion(si))
        }}
      />
    </div>
  )
}
