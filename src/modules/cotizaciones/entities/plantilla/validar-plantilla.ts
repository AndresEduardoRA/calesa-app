// La plantilla de la tarjeta validada como la valida la base: espejo de `validar_plantilla()` (4.19-2), con el juego
// común `casos-de-plantilla.json`. Es una ayuda al tipear (4.19-3): la base vuelve a validar al guardar y al publicar. Mismo orden, misma regla, mismo `donde`
// y el mismo mensaje; nunca lanza. Sin contexto (la base con `p_def` nulo) valida sólo la forma; sin `tonos`, no mira el catálogo.
// Dos formas: con la clave `forma` en la raíz, la cuadrícula (forma 2); sin ella, la de grupos (forma 1).
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { formaDeCuadricula } from './forma-de-cuadricula'
import { formaDePlantilla, type Plantilla } from './forma-de-plantilla'
import { comoJson, esObjetoJsonb } from '../json-de-la-base'
import { rechazoDePlantilla, type RechazoDePlantilla } from './motivos-de-plantilla'
import { revisarNodosDeCuadricula } from './nodos-de-cuadricula'
import { revisarNodosDePlantilla, type ContextoDeNodos } from './nodos-de-plantilla'
import { tonosQueYaNoEstan } from './tonos-que-ya-no-estan'

export type ContextoDePlantilla = ContextoDeNodos & { readonly tonos: readonly string[] | null }

export type ResultadoDeValidacionDePlantilla =
  | { ok: true; forma: 1; plantilla: Plantilla }
  | { ok: true; forma: 2; plantilla: PlantillaEnCuadricula }
  | { ok: false; error: RechazoDePlantilla }

// Los grupos: todos los de la fórmula, una vez cada uno, y (con el catálogo) cada tono elegido en él.
function revisarGrupos(
  plantilla: Plantilla,
  contexto: ContextoDePlantilla,
): RechazoDePlantilla | null {
  const deLaFormula = (contexto.definicion.grupos ?? []).map((g) => g.id)
  const existentes = new Set(deLaFormula)
  const nombrados = plantilla.grupos.map((g) => g.grupo)
  const inexistente = nombrados.find((g) => !existentes.has(g))
  if (inexistente !== undefined) return rechazoDePlantilla('grupo_inexistente', inexistente)
  const repetido = nombrados.find((g, i) => nombrados.indexOf(g) < i)
  if (repetido !== undefined) return rechazoDePlantilla('grupo_repetido', repetido)
  const enLaPlantilla = new Set(nombrados)
  const faltante = deLaFormula.find((g) => !enLaPlantilla.has(g))
  if (faltante !== undefined) return rechazoDePlantilla('grupo_faltante', faltante)
  if (contexto.tonos === null) return null
  const [sinTono] = tonosQueYaNoEstan(plantilla.grupos, contexto.tonos)
  return sinTono === undefined ? null : rechazoDePlantilla('tono_inexistente', sinTono.grupo)
}

// La forma 2 se reconoce por la clave `forma` de la raíz, aunque su valor no sea 2 (eso es `forma@forma`).
export const esDeLaCuadricula = (entrada: unknown): boolean => {
  const v = comoJson(entrada)
  return esObjetoJsonb(v) && Object.hasOwn(v, 'forma')
}

function validarLaCuadricula(
  entrada: unknown,
  contexto: ContextoDePlantilla | null,
  conTope: boolean,
): ResultadoDeValidacionDePlantilla {
  const forma = formaDeCuadricula(entrada, { conTope })
  if (!forma.ok) return forma
  const error = contexto === null ? null : revisarNodosDeCuadricula(forma.plantilla, contexto)
  return error === null ? { ok: true, forma: 2, plantilla: forma.plantilla } : { ok: false, error }
}

// `conTope: false` sólo para lo que sale de la conversión (D12): lo convertido no se mide contra los 24 KiB.
export function validarPlantilla(
  entrada: unknown,
  contexto: ContextoDePlantilla | null,
  { conTope }: { conTope: boolean } = { conTope: true },
): ResultadoDeValidacionDePlantilla {
  if (esDeLaCuadricula(entrada)) return validarLaCuadricula(entrada, contexto, conTope)
  const forma = formaDePlantilla(entrada)
  if (!forma.ok) return forma
  const plantilla = forma.plantilla
  const error =
    contexto === null
      ? null
      : (revisarGrupos(plantilla, contexto) ?? revisarNodosDePlantilla(plantilla, contexto))
  return error === null ? { ok: true, forma: 1, plantilla } : { ok: false, error }
}
