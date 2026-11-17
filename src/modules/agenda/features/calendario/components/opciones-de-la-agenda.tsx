import type { GrupoDeVistaYOpciones } from '@/shared/ui/vista-y-opciones'
import type { ClaveDeClase } from '../../../entities/agenda'
import { resumenDeClases } from '../../../entities/calendario'
import { FiltroDeClases } from './filtro-de-clases'
import { SelectorDeAgenda } from './selector-de-agenda'

type Datos = {
  clases: readonly ClaveDeClase[]
  puedeVerTodo: boolean
  deTodos: boolean
}

// Los grupos de «Vista y opciones» de la agenda: «Qué agenda ver» (sólo con `agenda.ver_todo`) y «Qué ver» (las clases). Día, semana y mes quedan a la vista.
export function opcionesDeLaAgenda({
  clases,
  puedeVerTodo,
  deTodos,
}: Datos): GrupoDeVistaYOpciones[] {
  const grupos: GrupoDeVistaYOpciones[] = []
  if (puedeVerTodo) {
    grupos.push({
      clave: 'alcance',
      titulo: 'Qué agenda ver',
      contenido: <SelectorDeAgenda deTodos={deTodos} />,
      resumen: deTodos ? 'De todos' : 'Mi agenda',
    })
  }
  grupos.push({
    clave: 'clases',
    titulo: 'Qué ver',
    contenido: <FiltroDeClases clases={clases} />,
    resumen: resumenDeClases(clases),
  })
  return grupos
}
