// La tarjeta de trabajo de un origen para la planilla de la fórmula (la tarjeta en vivo): la plantilla que se edita en la pestaña «Tarjeta» (el borrador si hay, si no
// la publicada), leída con la fórmula publicada (las etiquetas de la tarjeta son las suyas) y sólo con lo del nivel «todos», como toda tarjeta: un nodo restringido,
// el `pct` restringido de un par y el tipo de cambio restringido de un bucket (su nombre y su nodo) no viajan. La cuadrícula viaja entera: una fila o una celda que
// nombra un nodo restringido no se dibuja, porque sin el nodo en `nodos` el cálculo no le da estado y la geometría la da por fuera de la versión. El total va como
// en toda tarjeta. Puro.
import type { LecturaEnCuadricula, PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import type { LecturaDeLaTarjetaEnVivo, NombradoPorLaTarjeta } from '../tarjeta-en-vivo'
import type { DeDondeNace } from './borrador-de-la-plantilla'
import { nodosNombradosPor } from './contexto-para-el-navegador'
import type { Plantilla } from './forma-de-plantilla'
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
    tc.nodo === null || deTodos(tc.nodo) ? tc : { ...tc, nodo: null, nombre: null }
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

// Lo que nombra la tarjeta de la que nace el editor: los nodos de la cuadrícula (la de la forma 1 ya convertida) y, si lo guardado es de la forma 1, sus grupos
// (la forma 1 nombra todos) y las claves de sus etiquetas y leyendas.
// La plantilla de la forma 1 de la que nace (nula si nace de una cuadrícula o de la omisión).
function formaUnoDe(plantilla: PlantillaDelOrigen, de: DeDondeNace): Plantilla | null {
  const version =
    de === 'borrador' ? plantilla.borrador : de === 'publicada' ? plantilla.publicada : null
  const contenido = version?.contenido
  if (contenido === undefined || !('forma' in contenido) || contenido.forma !== 1) return null
  return contenido.plantilla
}

export function nombradoPorLaTarjeta(
  plantilla: PlantillaDelOrigen,
  de: DeDondeNace,
  cuadricula: PlantillaEnCuadricula,
): NombradoPorLaTarjeta {
  const vieja = formaUnoDe(plantilla, de)
  const nodos = new Set(nodosNombradosPor(cuadricula))
  if (vieja === null) return { nodos: [...nodos], grupos: [] }
  for (const k of Object.keys(vieja.etiquetas ?? {})) nodos.add(k)
  for (const k of Object.keys(vieja.leyendas ?? {})) nodos.add(k)
  return { nodos: [...nodos], grupos: vieja.grupos.map((g) => g.grupo) }
}

export function lecturaDeLaTarjetaDeTrabajo(
  plantilla: PlantillaDelOrigen,
  origen: { id: string; nombre: string },
): LecturaDeLaTarjetaEnVivo {
  const editor = propsDelEditor(plantilla, origen)
  if (editor === null || editor.de === 'omision') return { estado: 'sin_tarjeta' }
  const visibilidad = editor.contexto.visibilidad ?? {}
  const lectura = lecturaEnCuadricula(editor.inicial, editor.contexto, editor.tonos)
  return {
    estado: 'lista',
    lectura: soloDeTodos(lectura, (id) => esDeTodos(visibilidad, id)),
    nombra: nombradoPorLaTarjeta(plantilla, editor.de, editor.inicial),
  }
}
