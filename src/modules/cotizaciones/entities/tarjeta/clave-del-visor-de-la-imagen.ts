// La clave del visor de la imagen de la tarjeta en `?visor=` (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): una por lugar, así la tarjeta de la lista y el
// resumen abierto de la misma cotización no abren dos visores.
export type LugarDeLaImagen = 'resumen' | 'lista'

const PREFIJO: Record<LugarDeLaImagen, { nuevo: string; viejo: string }> = {
  resumen: { nuevo: 'imagen-', viejo: 'portada-' },
  lista: { nuevo: 'imagen-de-la-lista-', viejo: 'portada-de-la-lista-' },
}

// La clave con que se abre el visor de esa cotización en ese lugar: `imagen-<id>` en el resumen, `imagen-de-la-lista-<id>` en la tarjeta de la lista.
export const claveDelVisorDeLaImagen = (id: string, lugar: LugarDeLaImagen): string =>
  `${PREFIJO[lugar].nuevo}${id}`

// Si una clave de `?visor=` abre el visor de esa cotización en ese lugar: la de hoy o la de antes (`portada-<id>`, `portada-de-la-lista-<id>`), que siguen en
// enlaces guardados.
export const esClaveDelVisorDeLaImagen = (
  clave: string | null,
  id: string,
  lugar: LugarDeLaImagen,
): boolean => clave === `${PREFIJO[lugar].nuevo}${id}` || clave === `${PREFIJO[lugar].viejo}${id}`
