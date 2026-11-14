// Las pestañas del resumen de una cotización (`?cotizacion=` en `/cotizaciones`, `?pestana=`): «Todo» (una línea de tiempo con adjuntos, revisiones y comentarios juntos, lo más
// nuevo arriba) y cada una por separado. Las cuatro piden lo mismo que la guardada (ver la cotización): quien abre el resumen ya la ve, así que ninguna se esconde; si la base
// niega una lectura (la cotización se fue a la papelera o ya no se ve), esa pestaña lo dice. Puro: sin I/O.

// La misma clave que usan los demás resúmenes (`vehiculos`, `leads`): el listado la borra al abrir y al cerrar el resumen, y las pestañas la leen y la escriben.
export const CLAVE_DE_PESTANA_DEL_RESUMEN = 'pestana'

export const PESTANAS_DEL_RESUMEN_DE_COTIZACION = [
  { clave: 'todo', titulo: 'Todo' },
  { clave: 'adjuntos', titulo: 'Adjuntos' },
  { clave: 'revisiones', titulo: 'Revisiones' },
  { clave: 'comentarios', titulo: 'Comentarios' },
] as const

export type PestanaDelResumenDeCotizacion =
  (typeof PESTANAS_DEL_RESUMEN_DE_COTIZACION)[number]['clave']

// La de la URL; lo que no es una pestaña que existe abre «Todo».
export function pestanaDelResumenDeCotizacion(
  valor: string | null | undefined,
): PestanaDelResumenDeCotizacion {
  return PESTANAS_DEL_RESUMEN_DE_COTIZACION.find((p) => p.clave === valor)?.clave ?? 'todo'
}
