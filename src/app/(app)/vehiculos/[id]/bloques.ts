// Los bloques de la ficha de un vehículo (docs/UX.md › Vehículo), en el orden de su índice: cada uno se dibuja sólo con su permiso y, si no
// está, tampoco sale en el índice. «Ficha» siempre: el índice nunca queda vacío. Las fotos van a la izquierda (la tira bajo el carrusel) y se editan
// en «Editar imágenes». Lo leen el servidor (la página) y el test: nada de cliente acá.
import { puede, type Permisos } from '@/shared/lib/permisos'

export const BLOQUES_DE_LA_FICHA = [
  { ancla: 'fase', etiqueta: 'Qué falta', titulo: 'Fase y qué falta' },
  { ancla: 'relacionados', etiqueta: 'Relacionados', titulo: 'Relacionados' },
  { ancla: 'cotizaciones', etiqueta: 'Cotizaciones', titulo: 'Cotizaciones' },
  { ancla: 'documentos', etiqueta: 'Documentos', titulo: 'Documentos' },
  { ancla: 'ficha', etiqueta: 'Ficha', titulo: 'Ficha' },
  { ancla: 'repuestos', etiqueta: 'Repuestos', titulo: 'Repuestos' },
] as const

export type AnclaDeLaFicha = (typeof BLOQUES_DE_LA_FICHA)[number]['ancla']
export type BloqueDeLaFicha = (typeof BLOQUES_DE_LA_FICHA)[number]

// El parámetro de los enlaces de siempre (`?seccion=ficha`): ya no abre una pestaña, lleva a su bloque.
export const CLAVE_DE_SECCION = 'seccion'

// `?seccion=fotos` (el bloque que ya no está) abre el visor del carrusel de la cabecera en la primera foto.
const SECCION_DE_FOTOS = 'fotos'
const CLAVE_DEL_VISOR = 'visor'
const CLAVE_DE_LA_FOTO = 'foto'

// El drawer «Ver todos» de un grupo de «Relacionados» (`?relacionados=<tipo>`; la misma clave que `CLAVE_DE_RELACIONADOS` de `vehiculos`, que vive en
// un hook de cliente y no se importa en el servidor).
export const CLAVE_DE_RELACIONADOS = 'relacionados'

// Los paneles de «Relacionados» que se abren por la URL: llegar con uno lleva a ese bloque.
const PANELES_DE_RELACIONADOS: readonly string[] = [
  'desvincular',
  'vincular-lead',
  'marcar-interesado',
]

type Puertas = Record<Exclude<AnclaDeLaFicha, 'ficha'>, boolean>

// Lo que decide cada bloque: «Fase y qué falta» y «Documentos», `logistica.ver` del origen (la RLS de `documentos` va por él); «Relacionados»,
// `leads.ver`; «Cotizaciones», `cotizaciones.ver` del origen; «Repuestos», `repuestos.ver`, que es global (8.09-4, D75).
function puertasDe(permisos: Permisos, origenId: string): Puertas {
  const logistica = puede(permisos, 'logistica.ver', origenId)
  return {
    fase: logistica,
    relacionados: puede(permisos, 'leads.ver'),
    cotizaciones: puede(permisos, 'cotizaciones.ver', origenId),
    documentos: logistica,
    repuestos: puede(permisos, 'repuestos.ver'),
  }
}

/** Los bloques que ve quien tiene esos permisos en el origen del vehículo, en el orden del índice. */
export function bloquesDeQuienMira(permisos: Permisos, origenId: string): BloqueDeLaFicha[] {
  const puertas = puertasDe(permisos, origenId)
  return BLOQUES_DE_LA_FICHA.filter((bloque) => bloque.ancla === 'ficha' || puertas[bloque.ancla])
}

type DeLaUrl = {
  seccion: string | undefined
  panel: string | undefined
  relacionados: string | undefined
}

/**
 * El bloque al que lleva la URL al llegar, o null (arriba de todo). `?seccion=` gana: si nombra un bloque que quien mira ve, ése; si nombra
 * uno que no ve, ninguno (como antes abría «Ficha»). Sin una `seccion` conocida, un panel de «Relacionados» (`?panel=desvincular`…) o
 * `?relacionados=<tipo>` llevan a «Relacionados». Lo demás lo puede escribir cualquiera: no lleva a ningún lado.
 */
export function anclaDeLaUrl(
  { seccion, panel, relacionados }: DeLaUrl,
  visibles: readonly { ancla: AnclaDeLaFicha }[],
): AnclaDeLaFicha | null {
  const ve = (ancla: AnclaDeLaFicha) => visibles.some((bloque) => bloque.ancla === ancla)
  const nombrado = BLOQUES_DE_LA_FICHA.find((bloque) => bloque.ancla === seccion)
  if (nombrado) {
    return ve(nombrado.ancla) ? nombrado.ancla : null
  }
  const aRelacionados =
    (panel !== undefined && PANELES_DE_RELACIONADOS.includes(panel)) || relacionados !== undefined
  return aRelacionados && ve('relacionados') ? 'relacionados' : null
}

/**
 * A dónde redirige `?seccion=fotos`, o null si la URL no lo pide: a la misma ficha con el visor abierto en la primera foto (`?visor=<id>&foto=1`),
 * conservando los demás parámetros. La redirección reemplaza la entrada del historial (`redirigir()`).
 */
export function destinoDeLaSeccionFotos(
  vehiculoId: string,
  parametros: Readonly<Record<string, string | string[] | undefined>>,
): string | null {
  const seccion = parametros[CLAVE_DE_SECCION]
  const pide = Array.isArray(seccion)
    ? seccion.includes(SECCION_DE_FOTOS)
    : seccion === SECCION_DE_FOTOS
  if (!pide) {
    return null
  }
  const destino = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    if (
      [CLAVE_DE_SECCION, CLAVE_DEL_VISOR, CLAVE_DE_LA_FOTO].includes(clave) ||
      valor === undefined
    ) {
      continue
    }
    for (const uno of Array.isArray(valor) ? valor : [valor]) {
      destino.append(clave, uno)
    }
  }
  destino.set(CLAVE_DEL_VISOR, vehiculoId)
  destino.set(CLAVE_DE_LA_FOTO, '1')
  return `/vehiculos/${vehiculoId}?${destino.toString()}`
}
