// Cuándo se vuelve a montar la sesión de edición de la fórmula (la que tiene la fórmula de trabajo de la planilla y del Modo avanzado). La sesión guarda sobre la
// versión que leyó (C8: su `key` no lleva la versión): guardar sobre la publicada crea el borrador y la pestaña pasa a él sin volver a montarla. Pero si la versión
// cambia por algo que no hizo ella (se publicó o se descartó el borrador, o se revirtió la publicada sobre la que editaba), lo que tiene ya no es de ninguna versión
// y se vuelve a montar sobre la nueva. Puro.

export type SobreQueVersion = { readonly tipo: 'borrador' | 'publicada'; readonly id: string }

export const mismaVersion = (a: SobreQueVersion | null, b: SobreQueVersion | null): boolean =>
  a === b || (a !== null && b !== null && a.tipo === b.tipo && a.id === b.id)

export function otraSesion(antes: SobreQueVersion | null, ahora: SobreQueVersion | null): boolean {
  if (mismaVersion(antes, ahora)) return false
  // Su propio guardado: de la publicada al borrador nuevo.
  return !(antes?.tipo === 'publicada' && ahora?.tipo === 'borrador')
}
