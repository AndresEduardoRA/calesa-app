// Cómo se edita la lista de datos clave en «Campos»: operaciones puras sobre la lista (cada una devuelve otra) y el motivo de una estrella
// apagada. La base vuelve a validar cada lista que llega (`origen_datos_clave_guardar()`).
import { MENSAJE_TOPE_DE_DATOS_CLAVE, TOPE_DE_DATOS_CLAVE, type DatoClave } from './datos-clave'

export const MOTIVO_SIN_PERMISO_DATOS_CLAVE =
  'Para elegir los datos clave hace falta gestionar los orígenes.'

export const MOTIVO_DATOS_CLAVE_VACIOS =
  'Sin datos clave: la ficha mostrará los de fábrica de su tipo.'

export function mismoDato(a: DatoClave, b: DatoClave): boolean {
  if ('comun' in a) {
    return 'comun' in b && a.comun === b.comun
  }
  return 'campo' in b && a.campo === b.campo
}

export function esDatoClave(lista: readonly DatoClave[], dato: DatoClave): boolean {
  return lista.some((otro) => mismoDato(otro, dato))
}

// Lo suma al final; si ya está o ya hay 4, la lista queda igual.
export function conDatoClave(lista: readonly DatoClave[], dato: DatoClave): DatoClave[] {
  if (esDatoClave(lista, dato) || lista.length >= TOPE_DE_DATOS_CLAVE) {
    return [...lista]
  }
  return [...lista, dato]
}

export function sinDatoClave(lista: readonly DatoClave[], dato: DatoClave): DatoClave[] {
  return lista.filter((otro) => !mismoDato(otro, dato))
}

// Cambia de lugar con el vecino; en el borde, la lista queda igual.
export function moverDatoClave(
  lista: readonly DatoClave[],
  indice: number,
  sentido: 'subir' | 'bajar',
): DatoClave[] {
  const destino = sentido === 'subir' ? indice - 1 : indice + 1
  const copia = [...lista]
  const actual = copia[indice]
  const vecino = copia[destino]
  if (actual === undefined || vecino === undefined) {
    return copia
  }
  copia[indice] = vecino
  copia[destino] = actual
  return copia
}

// Por qué la estrella de ese dato no se puede tocar, o null. Quitar uno marcado siempre se puede (con el permiso).
export function motivoParaNoMarcar({
  lista,
  dato,
  puedeGestionar,
}: {
  lista: readonly DatoClave[]
  dato: DatoClave
  puedeGestionar: boolean
}): string | null {
  if (!puedeGestionar) {
    return MOTIVO_SIN_PERMISO_DATOS_CLAVE
  }
  if (!esDatoClave(lista, dato) && lista.length >= TOPE_DE_DATOS_CLAVE) {
    return MENSAJE_TOPE_DE_DATOS_CLAVE
  }
  return null
}
