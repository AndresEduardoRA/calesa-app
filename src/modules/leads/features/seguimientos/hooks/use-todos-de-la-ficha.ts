'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_TODOS,
  TODOS_DE_LA_FICHA,
  type TodosDeLaFicha,
} from '../../../entities/bloques-de-la-ficha'

const PARSER = parseAsStringLiteral(TODOS_DE_LA_FICHA)

// «Ver todos» de seguimientos o de recordatorios en la URL (`?todos=seguimientos|recordatorios`): su propia clave, para convivir con los
// modales de `?panel=` (que se abren encima). Abrir suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo
// abrió). Una sola vigilancia del foco para los dos valores: comparten la clave.
export function useTodosDeLaFicha() {
  const [todos, setTodos] = useQueryState(CLAVE_DE_TODOS, PARSER)
  useVueltaDelFoco(CLAVE_DE_TODOS, todos !== null)
  return {
    // Cuál está abierto, o ninguno.
    abierto: todos,
    abrir: (cual: TodosDeLaFicha) => {
      recordarQuienAbre()
      abrirConVuelta(CLAVE_DE_TODOS, () => setTodos(cual, { history: 'push' }), todos === cual)
    },
    cerrar: () => {
      void setTodos(null)
    },
  }
}

export type TodosAbiertos = ReturnType<typeof useTodosDeLaFicha>
