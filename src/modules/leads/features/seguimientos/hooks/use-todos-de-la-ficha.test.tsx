import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { CLAVE_DE_TODOS } from '../../../entities/bloques-de-la-ficha'
import { useTodosDeLaFicha } from './use-todos-de-la-ficha'

type Todos = ReturnType<typeof useTodosDeLaFicha>

// «Ver todos» de seguimientos o de recordatorios (`?todos=`): tras recargar con el drawer abierto, «atrás» devuelve el foco a quien lo abrió.
probarLaVuelta({
  hook: 'useTodosDeLaFicha',
  usar: useTodosDeLaFicha,
  clave: CLAVE_DE_TODOS,
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir seguimientos',
      abrir: (todos: Todos) => {
        todos.abrir('seguimientos')
      },
      abierta: `?${CLAVE_DE_TODOS}=seguimientos`,
      abierto: (todos: Todos) => todos.abierto === 'seguimientos',
    },
    {
      nombre: 'abrir recordatorios',
      abrir: (todos: Todos) => {
        todos.abrir('recordatorios')
      },
      abierta: `?${CLAVE_DE_TODOS}=recordatorios`,
      abierto: (todos: Todos) => todos.abierto === 'recordatorios',
    },
  ],
  cerrar: (todos) => {
    todos.cerrar()
  },
})
