'use client'

import type { RefObject } from 'react'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import type {
  EleccionesDeLaHoja,
  ObligatoriosAlCotizar,
} from '../../../entities/obligatorios-al-cotizar'
import { useGuardarLaGuardada, type EdicionDeLaHoja } from './use-guardar-la-guardada'
import { useGuardarLaHoja } from './use-guardar-la-hoja'
import type { Guardado } from './use-nucleo-del-guardado'
import type { useHoja } from './use-hoja'

// «Guardar» de la hoja: el de la nueva (`useGuardarLaHoja`, con lo que el rol pide elegir) o, en una guardada que quien mira puede guardar, el de la edición. `hayCambios` es el de la
// guardada: «Cotizar encima» espera a que no haya cambios.
export function useBotonesDeGuardar({
  edicion,
  ...nueva
}: {
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  hoja: HojaLista
  leadId: string | null
  vehiculoId: string | null
  obligatorios: ObligatoriosAlCotizar | undefined
  elecciones: EleccionesDeLaHoja | undefined
  guardado: Guardado | null
  edicion: EdicionDeLaHoja | undefined
  raiz: RefObject<HTMLDivElement | null>
}) {
  const deLaNueva = useGuardarLaHoja(nueva)
  const deLaGuardada = useGuardarLaGuardada({
    h: nueva.h,
    contexto: nueva.contexto,
    edicion: edicion ?? null,
    raiz: nueva.raiz,
  })
  return { boton: deLaNueva.boton ?? deLaGuardada.boton, hayCambios: deLaGuardada.hayCambios }
}
