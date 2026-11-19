// La tarjeta de trabajo de un origen para la planilla de la fórmula (la tarjeta en vivo): la plantilla que se edita en la pestaña «Tarjeta» (el borrador si hay, si no
// la publicada), leída con la fórmula publicada (las etiquetas de la tarjeta son las suyas) y sólo con lo del nivel «todos», como toda tarjeta: un nodo restringido,
// el `pct` restringido de un par y el tipo de cambio restringido de un bucket no viajan (su fila no se dibuja: la geometría la da por fuera de la versión). Puro.
import type { LecturaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import type { LecturaDeLaTarjetaEnVivo } from '../tarjeta-en-vivo'
import type { PlantillaDelOrigen } from './lectura-de-la-plantilla'
import { lecturaEnCuadricula } from './lectura-en-cuadricula'
import { esDeTodos } from './nodos-de-plantilla'
import { propsDelEditor } from './props-del-editor'

type TipoDeCambio = { readonly nombre: string | null; readonly nodo: string | null }

function soloDeTodos(
  lectura: LecturaEnCuadricula,
  deTodos: (id: string) => boolean,
): LecturaEnCuadricula {
  const delTipo = <T extends TipoDeCambio>(tc: T): T =>
    tc.nodo === null || deTodos(tc.nodo) ? tc : { ...tc, nodo: null }
  return {
    ...lectura,
    nodos: lectura.nodos
      .filter((n) => deTodos(n.id))
      .map((n) => (n.pct === null || deTodos(n.pct) ? n : { ...n, pct: null })),
    tiposDeCambio: {
      buckets: lectura.tiposDeCambio.buckets.map(delTipo),
      modos: lectura.tiposDeCambio.modos.map(delTipo),
    },
  }
}

export function lecturaDeLaTarjetaDeTrabajo(
  plantilla: PlantillaDelOrigen,
  origen: { id: string; nombre: string },
): LecturaDeLaTarjetaEnVivo {
  const editor = propsDelEditor(plantilla, origen)
  if (editor === null || editor.de === 'omision') return { estado: 'sin_tarjeta' }
  const visibilidad = editor.contexto.visibilidad ?? {}
  const lectura = lecturaEnCuadricula(editor.inicial, editor.contexto, editor.tonos)
  return { estado: 'lista', lectura: soloDeTodos(lectura, (id) => esDeTodos(visibilidad, id)) }
}
