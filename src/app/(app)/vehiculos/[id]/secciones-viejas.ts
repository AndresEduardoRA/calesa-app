// Los enlaces de siempre a un bloque que dejó la derecha de la ficha del vehículo (`docs/UX.md` › «Vehículo»): `?seccion=fotos` abre el visor,
// `?seccion=ficha` la ficha completa, `?seccion=vitrina` el panel «Publicar en la web…» (`?panel=vitrina`), y `documentos`, `fase` y `repuestos` llevan a su página si quien mira la ve (si no, la ficha se queda arriba).
// Puro: la página lee los permisos y arma las rutas de otros módulos; acá sólo se decide. Cada destino reemplaza la entrada del historial (`redirigir()`).
import { z } from 'zod'
import { CLAVE_DE_SECCION } from './bloques'

type Parametros = Readonly<Record<string, string | string[] | undefined>>

const CLAVE_DEL_VISOR = 'visor'
const CLAVE_DE_LA_FOTO = 'foto'
const CLAVE_DEL_PANEL = 'panel'
const PANEL_DE_VITRINA = 'vitrina'

// Las secciones que redirigen sin leer nada y las que piden el permiso de su destino.
const SIN_LEER = ['fotos', 'ficha', 'vitrina'] as const
const CON_PERMISOS = ['documentos', 'fase', 'repuestos'] as const
export type SeccionConPermisos = (typeof CON_PERMISOS)[number]

// La clave y el valor que abren la ficha completa (`?ver=ficha`, de `vehiculos`).
export type ClaveDeLaFichaCompleta = { clave: string; valor: string }

/** La `seccion` de la URL si es una sola (repetida o ausente: ninguna). */
function seccionDe(parametros: Parametros): string | null {
  const seccion = parametros[CLAVE_DE_SECCION]
  return typeof seccion === 'string' ? seccion : null
}

/** La misma ficha con los parámetros de hoy, sin `seccion` ni los que se pisan, y con los nuevos. */
function mismaFichaCon(
  vehiculoId: string,
  parametros: Parametros,
  nuevos: Readonly<Record<string, string>>,
): string {
  const destino = new URLSearchParams()
  const pisados = new Set([CLAVE_DE_SECCION, ...Object.keys(nuevos)])
  for (const [clave, valor] of Object.entries(parametros)) {
    if (pisados.has(clave) || valor === undefined) {
      continue
    }
    for (const uno of Array.isArray(valor) ? valor : [valor]) {
      destino.append(clave, uno)
    }
  }
  for (const [clave, valor] of Object.entries(nuevos)) {
    destino.set(clave, valor)
  }
  return `/vehiculos/${vehiculoId}?${destino.toString()}`
}

/**
 * A dónde redirige `?seccion=fotos|ficha|vitrina` antes de leer el vehículo, o null: `fotos`, a la misma ficha con el visor en la primera foto
 * (`?visor=<id>&foto=1`); `ficha`, a la misma ficha con la ficha completa abierta (`?ver=ficha`); `vitrina`, con el panel de la vitrina (`?panel=vitrina`). Conserva los demás parámetros. Si el vehículo no
 * existe o no se ve, la página dice «No existe o no tienes acceso» después de la redirección, como en cualquier ficha.
 */
export function destinoSinLeer(
  vehiculoId: string,
  parametros: Parametros,
  fichaCompleta: ClaveDeLaFichaCompleta,
): string | null {
  // Un id que no es un uuid no se interpola en la ruta (podría traer `../` o `?`): la página ya dice «No existe o no tienes acceso».
  if (!z.guid().safeParse(vehiculoId).success) {
    return null
  }
  const seccion = seccionDe(parametros)
  if (seccion === 'fotos') {
    return mismaFichaCon(vehiculoId, parametros, {
      [CLAVE_DEL_VISOR]: vehiculoId,
      [CLAVE_DE_LA_FOTO]: '1',
    })
  }
  if (seccion === 'vitrina') {
    return mismaFichaCon(vehiculoId, parametros, { [CLAVE_DEL_PANEL]: PANEL_DE_VITRINA })
  }
  return seccion === 'ficha'
    ? mismaFichaCon(vehiculoId, parametros, { [fichaCompleta.clave]: fichaCompleta.valor })
    : null
}

/** La sección que pide el permiso de su destino (`documentos`, `fase`, `repuestos`), o null: la página lee ese permiso sólo si hace falta. */
export function seccionConPermisos(parametros: Parametros): SeccionConPermisos | null {
  const seccion = seccionDe(parametros)
  return CON_PERMISOS.find((una) => una === seccion) ?? null
}

// Lo que la página resolvió para quien mira: las rutas de logística con `logistica.ver` del origen (si no, null) y la del proyecto de repuestos con
// `repuestos.ver` y si el vehículo tiene uno (si no, null).
export type DestinosConPermisos = {
  logistica: { unidad: string; documentos: string } | null
  proyecto: string | null
}

/**
 * A dónde lleva una sección que se fue a otra página, o null (la ficha se queda arriba: el ancla ya no existe): `documentos`, al hueco de
 * documentos de la unidad; `fase`, a la unidad; `repuestos`, al proyecto. Los parámetros de la ficha no viajan a otra página.
 */
export function destinoConPermisos(
  seccion: SeccionConPermisos,
  destinos: DestinosConPermisos,
): string | null {
  switch (seccion) {
    case 'documentos':
      return destinos.logistica?.documentos ?? null
    case 'fase':
      return destinos.logistica?.unidad ?? null
    case 'repuestos':
      return destinos.proyecto
  }
}

// Las secciones viejas que ya no son un bloque (las prueba el test: ninguna lleva a un ancla).
export const SECCIONES_QUE_SE_FUERON: readonly string[] = [...SIN_LEER, ...CON_PERMISOS]
