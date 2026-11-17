// Composición del módulo en el servidor: aquí se decide qué implementación recibe cada interfaz de `entities/`. Las entradas importan de
// este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeAgenda } from './entities/agenda'
import type { LectorDeEvento, LectorDeTarea } from './entities/detalle'
import type { LectorDeMisTareas } from './entities/mis-tareas'
import type { LectorDeQuienesPueden } from './entities/personas'
import type { LectorDeRecordatorio } from './entities/recordatorio'
import { getAgenda } from './infra/queries/agenda'
import { repositorioDeEventos } from './infra/eventos'
import { getEvento, getTarea } from './infra/queries/detalle'
import { getMisTareas } from './infra/queries/mis-tareas'
import { getRecordatorio } from './infra/queries/recordatorio'
import { leerQuienesPuedenRecibir as leerQuienesPuedenDeLaBase } from './infra/personas'
import { repositorioDeTareas } from './infra/tareas'

export const leerAgenda: LectorDeAgenda = getAgenda
export const leerEvento: LectorDeEvento = getEvento
export const leerTarea: LectorDeTarea = getTarea
export const leerRecordatorio: LectorDeRecordatorio = getRecordatorio
export const leerMisTareas: LectorDeMisTareas = getMisTareas
// A quién darle una tarea sobre una unidad, por un permiso en su origen (lo usa `logistica`).
export const leerQuienesPuedenRecibir: LectorDeQuienesPueden = leerQuienesPuedenDeLaBase

// Escribir (`evento_*` y `tarea_*`): lo usan las actions de `features/eventos` y `features/tareas`.
export { repositorioDeEventos, repositorioDeTareas }
