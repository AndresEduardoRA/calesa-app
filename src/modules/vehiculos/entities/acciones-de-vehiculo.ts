// El «⋯» de un vehículo, dicho una sola vez: qué acciones tiene, en qué orden y cuáles se ven. La fila del inventario, la tarjeta y la ficha
// dibujan esta lista (`features/acciones/components/menu-de-vehiculo.tsx`); ninguna escribe la suya. Es la de los leads
// (`leads/entities/acciones-de-lead.ts`): la acción principal sola arriba (cotizar), lo que se hace con el vehículo, «Ver actividad» y lo
// destructivo al final y separado. Cuándo se ofrece cada una lo dice `ofertas-del-menu-de-vehiculo.ts`.

export type ClaveDeAccionDeVehiculo =
  'cotizar' | 'editar' | 'imagenes' | 'publicar' | 'actualizar' | 'actividad' | 'papelera'

export const ETIQUETA_DE_ACCION_DE_VEHICULO: Readonly<Record<ClaveDeAccionDeVehiculo, string>> = {
  // Lleva a la hoja de cotizar con este vehículo y su origen (`rutaParaCotizar()`), con `returnTo` = donde se estaba.
  cotizar: 'Cotizar vehículo',
  editar: 'Editar',
  // Abre su propio drawer (`?panel=imagenes`).
  imagenes: 'Editar imágenes',
  // Abre el panel de la vitrina, con su vista previa: lleva «…». Ya publicado, «Editar publicación…» (`etiquetaDeAccionDeVehiculo`).
  publicar: 'Publicar en la web…',
  // Vuelve a consultar la subasta en apibara (pide confirmar: gasta cuota).
  actualizar: 'Actualizar los datos',
  // Lleva a otra página (`/actividad` de este vehículo): sin «…».
  actividad: 'Ver actividad',
  papelera: 'Enviar a la papelera',
}

// La acción principal del «⋯» (en negrita, con su icono y sola en su bloque).
export const ACCION_PRINCIPAL_DEL_VEHICULO: ClaveDeAccionDeVehiculo = 'cotizar'

// El texto de una acción según el vehículo: publicar dice «Editar publicación…» si ya está en la web.
export function etiquetaDeAccionDeVehiculo(
  clave: ClaveDeAccionDeVehiculo,
  { publicado }: { publicado: boolean },
): string {
  return clave === 'publicar' && publicado
    ? 'Editar publicación…'
    : ETIQUETA_DE_ACCION_DE_VEHICULO[clave]
}

// El orden, en bloques: cotizar sola arriba; editar, sus imágenes, la web y la subasta; «Ver actividad»; y la papelera al final y separada.
export const BLOQUES_DEL_MENU_DE_VEHICULO: readonly (readonly ClaveDeAccionDeVehiculo[])[] = [
  ['cotizar'],
  ['editar', 'imagenes', 'publicar', 'actualizar'],
  ['actividad'],
  ['papelera'],
]

// Cómo se ofrece cada una: `oculta` no existe; `apagada` se ve y no se puede (dice por qué, debajo); `habilitada` se puede.
export type OfertaDeAccion = 'oculta' | 'apagada' | 'habilitada'

export type OfertasDelMenuDeVehiculo = Readonly<Record<ClaveDeAccionDeVehiculo, OfertaDeAccion>>

// Las acciones que se ofrecen, por bloques y en su orden (sin bloques vacíos).
export function accionesDeVehiculo(ofertas: OfertasDelMenuDeVehiculo): ClaveDeAccionDeVehiculo[][] {
  return BLOQUES_DEL_MENU_DE_VEHICULO.map((bloque) =>
    bloque.filter((clave) => ofertas[clave] !== 'oculta'),
  ).filter((bloque) => bloque.length > 0)
}
