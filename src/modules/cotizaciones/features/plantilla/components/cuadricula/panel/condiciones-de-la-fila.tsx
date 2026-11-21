'use client'

import { useRegional } from '@/shared/ui/regional'
import type { CondicionDeLaTarjeta } from '../../../../../entities/cuadricula-de-la-tarjeta'
import { completarSi } from '../../../../../entities/plantilla/edicion/borradores-de-la-celda'
import {
  borradorDeLaCondicion,
  CONDICION_VACIA,
  type CondicionEnBorrador,
} from '../../../../../entities/plantilla/edicion/condiciones'
import type { AccionDelEditor } from '../../../../../entities/plantilla/edicion/reductor'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { useBorradorDeLaRegla } from '../../../hooks/use-borrador-de-la-regla'
import { ListaDeCondiciones, operacionesDeLasCondiciones } from './lista-de-condiciones'
import { MenuDelBloque } from './menu-del-bloque'
import { SinTerminar } from './sin-terminar'

type Props = {
  fila: number
  // Las condiciones de la fila, o vacío si todavía no se oculta según condiciones.
  si: readonly CondicionDeLaTarjeta[]
  // La clave que junta en un solo paso lo que se tipea en esta fila.
  clave: string
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  hacer: (accion: AccionDelEditor) => void
}

// «Ocultar la fila: según condiciones»: la fila no se dibuja si se cumplen todas (de 1 a 3, unidas con Y). Lo que falta queda aquí con su motivo y la fila no cambia
// hasta completarla.
export function CondicionesDeLaFila({ fila, si, clave, contexto, nombrados, hacer }: Props) {
  const { locale } = useRegional()
  const { borrador, cambiar, motivos, completo } = useBorradorDeLaRegla<
    readonly CondicionEnBorrador[],
    readonly CondicionDeLaTarjeta[]
  >({
    valor: si,
    derivar: (v) =>
      v.length === 0 ? [CONDICION_VACIA] : v.map((c) => borradorDeLaCondicion(c, locale)),
    completar: (b) => completarSi(b, locale),
    alCompletar: (v, k) => {
      hacer({ tipo: 'ocultarSegun', fila, si: v, ...(k === undefined ? {} : { clave: k }) })
    },
  })
  return (
    <div className="grid min-w-0 gap-2" data-condiciones-de-la-fila="">
      {completo ? null : <SinTerminar fila />}
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="font-medium">Se oculta si</p>
        <MenuDelBloque
          etiqueta="Más acciones de las condiciones de la fila"
          operaciones={operacionesDeLasCondiciones(borrador, (nuevo) => {
            cambiar(nuevo)
          })}
        />
      </div>
      <ListaDeCondiciones
        si={borrador}
        lugar="si"
        motivos={motivos}
        contexto={contexto}
        nombrados={nombrados}
        clave={clave}
        alCambiar={cambiar}
      />
    </div>
  )
}
