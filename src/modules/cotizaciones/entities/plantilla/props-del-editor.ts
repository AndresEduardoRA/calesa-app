// Lo que la pestaña «Tarjeta» le pasa al editor, calculado en el servidor: la cuadrícula de la que nace (forma 2), su procedencia y sus avisos, y el contexto reducido.
// Nunca la lectura entera ni la definición de la fórmula. Puro: la sección es un Server Component async y Vitest no lo monta, así que lo que decide se prueba aquí.
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { cuadriculaParaEditar, type DeDondeNace } from './borrador-de-la-plantilla'
import { contextoParaElNavegador } from './contexto-para-el-navegador'
import type { PlantillaDelOrigen, TonoDelCatalogo } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

export type PropsDelEditor = {
  readonly origen: { readonly id: string; readonly nombre: string }
  // La versión esperada de guardar: el `actualizadoEn` del borrador tal cual (texto), nulo sin borrador.
  readonly esperada: string | null
  readonly inicial: PlantillaEnCuadricula
  readonly de: DeDondeNace
  readonly avisos: readonly string[]
  readonly contexto: ContextoDePlantilla
  readonly tonos: readonly TonoDelCatalogo[]
  readonly publicada: {
    readonly version: number | null
    readonly nota: string | null
    readonly publicadoEn: string | null
  } | null
  // La cuadrícula guardada en el borrador (para saber si hay cambios); nula sin borrador, si no se pudo leer o si es de la forma 1 (convertida, hay que guardarla).
  readonly guardada: PlantillaEnCuadricula | null
}

// Sin fórmula publicada no hay editor (nulo).
export function propsDelEditor(
  lectura: PlantillaDelOrigen,
  origen: { id: string; nombre: string },
): PropsDelEditor | null {
  if (lectura.formula === null || lectura.contexto === null) return null
  const nace = cuadriculaParaEditar({
    borrador: lectura.borrador,
    publicada: lectura.publicada,
    contexto: lectura.contexto,
    tonos: lectura.tonos.map((t) => t.clave),
  })
  const { publicada, borrador } = lectura
  const guardada =
    borrador !== null && 'forma' in borrador.contenido && borrador.contenido.forma === 2
      ? borrador.contenido.cuadricula
      : null
  return {
    origen: { id: origen.id, nombre: origen.nombre },
    esperada: borrador?.actualizadoEn ?? null,
    inicial: nace.cuadricula,
    de: nace.de,
    avisos: nace.avisos,
    contexto: contextoParaElNavegador(lectura.contexto, nace.cuadricula),
    tonos: lectura.tonos,
    publicada:
      publicada === null
        ? null
        : { version: publicada.version, nota: publicada.nota, publicadoEn: publicada.publicadoEn },
    guardada,
  }
}

// Los ids de los nodos que viajan al navegador: la referencia del lienzo se recorta a ellos.
export const idsDelContexto = (contexto: ContextoDePlantilla): ReadonlySet<string> =>
  new Set([
    ...(contexto.definicion.nodos ?? []).map((n) => n.id),
    ...Object.keys(contexto.visibilidad ?? {}),
  ])
