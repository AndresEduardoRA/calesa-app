// Los documentos legales del sitio (8.03-2): sólo dos, `terminos` y `privacidad`, guardados dentro de `ajustes_web.legales` por
// `web_ajustes_guardar`. La base decide (`_web_legales_validar`: sin imágenes, con texto, título de 1 a 120); esto reduce lo que se manda
// y explica en la pantalla.
import { documentoLimpio, type DocumentoDelSitio } from './documento-limpio'
import { esObjeto } from './doc-nodos'
import { tieneCuerpo } from './guias'

export const CLAVES_DE_LEGALES = ['terminos', 'privacidad'] as const
export type ClaveDeLegal = (typeof CLAVES_DE_LEGALES)[number]

export const MAXIMO_DEL_TITULO_LEGAL = 120

export const MOTIVO_SIN_PERMISO_PARA_LEGALES = 'No tienes permiso para cambiar los legales.'

// Los textos de cada documento: su título de partida, el nombre del editor (distinto en cada uno: con dos editores en la pantalla
// el nombre accesible no se puede repetir) y el motivo si se vacía.
export const TEXTOS_DE_LEGALES: Record<
  ClaveDeLegal,
  { titulo: string; editor: string; sinTexto: string }
> = {
  terminos: {
    titulo: 'Términos y condiciones',
    editor: 'Texto de los términos',
    sinTexto: 'Escribe el texto de los términos.',
  },
  privacidad: {
    titulo: 'Política de privacidad',
    editor: 'Texto de la política',
    sinTexto: 'Escribe el texto de la política.',
  },
}

export type LegalGuardado = { titulo: string; doc: DocumentoDelSitio; actualizadoEn: string | null }

// `actualizadoEn` es la versión de toda la fila `ajustes_web` (la misma de «Ajustes»).
export type LegalesDelSitio = {
  terminos: LegalGuardado | null
  privacidad: LegalGuardado | null
  actualizadoEn: string
}

// Lo que hay en pantalla de cada documento. Un modal edita uno solo: el otro no viaja (la base conserva lo guardado y su fecha).
export type ValoresDeLegales = Partial<Record<ClaveDeLegal, { titulo: string; doc: unknown }>>

// Quita las imágenes de primer nivel: `legales` las rechaza.
export function sinImagenes(documento: DocumentoDelSitio): DocumentoDelSitio {
  return { type: 'doc', content: documento.content.filter((bloque) => bloque.type !== 'image') }
}

// El documento que se manda: la lista blanca, sin imágenes; `null` si no queda texto.
function documentoDeLegal(doc: unknown): DocumentoDelSitio | null {
  const limpio = documentoLimpio(doc)
  const sinFotos = limpio === null ? null : sinImagenes(limpio)
  return sinFotos !== null && tieneCuerpo(sinFotos) ? sinFotos : null
}

function legalDesde(crudo: unknown): LegalGuardado | null {
  if (!esObjeto(crudo) || typeof crudo['titulo'] !== 'string') {
    return null
  }
  const doc = documentoDeLegal(crudo['doc'])
  if (doc === null) {
    return null
  }
  const version = crudo['actualizado_en']
  return {
    titulo: crudo['titulo'],
    doc,
    actualizadoEn: typeof version === 'string' ? version : null,
  }
}

// Lo guardado en `ajustes_web.legales`, leído con defensa: una clave desconocida se ignora y un documento roto es «no hay», nunca un error.
export function legalesDesde(json: unknown, actualizadoEn: string): LegalesDelSitio {
  const crudo = esObjeto(json) ? json : {}
  return {
    terminos: legalDesde(crudo['terminos']),
    privacidad: legalDesde(crudo['privacidad']),
    actualizadoEn,
  }
}

export type CambiosDeLegales = Partial<
  Record<ClaveDeLegal, { titulo: string; doc: DocumentoDelSitio }>
>

// Lo que se manda a `web_ajustes_guardar` en la clave `legales`: sólo los documentos que tienen texto. Los que no, no se mandan (la base
// conserva lo guardado y no crea uno vacío).
export function cambiosDeLegales(valores: ValoresDeLegales): CambiosDeLegales {
  const cambios: CambiosDeLegales = {}
  for (const clave of CLAVES_DE_LEGALES) {
    const valor = valores[clave]
    const doc = valor === undefined ? null : documentoDeLegal(valor.doc)
    if (valor !== undefined && doc !== null) {
      cambios[clave] = { titulo: valor.titulo.trim(), doc }
    }
  }
  return cambios
}

// Los motivos por campo, o `{}` si todo está bien. Un documento sin texto y sin guardar antes se ignora; uno ya guardado al que se le
// vació el texto no se puede dejar así. El título (campo `<clave>Titulo`) pide de 1 a 120 caracteres cuando el documento se manda.
export function legalesInvalidos(
  valores: ValoresDeLegales,
  guardados: Pick<LegalesDelSitio, ClaveDeLegal>,
): Partial<Record<ClaveDeLegal | `${ClaveDeLegal}Titulo`, string>> {
  const motivos: Partial<Record<ClaveDeLegal | `${ClaveDeLegal}Titulo`, string>> = {}
  for (const clave of CLAVES_DE_LEGALES) {
    const valor = valores[clave]
    if (valor === undefined) {
      continue
    }
    const conTexto = documentoDeLegal(valor.doc) !== null
    if (!conTexto) {
      if (guardados[clave] !== null) {
        motivos[clave] = TEXTOS_DE_LEGALES[clave].sinTexto
      }
      continue
    }
    const titulo = valor.titulo.trim()
    if (titulo === '') {
      motivos[`${clave}Titulo`] = 'Escribe el título.'
    } else if (titulo.length > MAXIMO_DEL_TITULO_LEGAL) {
      motivos[`${clave}Titulo`] =
        `El título lleva hasta ${String(MAXIMO_DEL_TITULO_LEGAL)} caracteres.`
    }
  }
  return motivos
}

// El estado de un documento legal: lo guardado es lo que el sitio muestra (no hay borrador ni programación: guardar publica), y uno que aún no
// se escribió no está en el sitio.
export type EstadoDeLegal = 'publicada' | 'sin-publicar'

export const ETIQUETA_DEL_ESTADO_DE_LEGAL: Record<EstadoDeLegal, string> = {
  publicada: 'Publicada',
  'sin-publicar': 'Sin publicar',
}

export function estadoDeLegal(legal: LegalGuardado | null): EstadoDeLegal {
  return legal === null ? 'sin-publicar' : 'publicada'
}

export const LARGO_DEL_EXTRACTO_DE_LEGAL = 140

function textoDeNodo(nodo: unknown): string {
  if (!esObjeto(nodo)) {
    return ''
  }
  if (nodo['type'] === 'text') {
    return typeof nodo['text'] === 'string' ? nodo['text'] : ''
  }
  const hijos = Array.isArray(nodo['content']) ? (nodo['content'] as unknown[]) : []
  const textos = hijos.map(textoDeNodo).filter((texto) => texto !== '')
  return textos.join(nodo['type'] === 'paragraph' || nodo['type'] === 'heading' ? '' : ' ')
}

// Las primeras palabras del texto, para que la tarjeta diga de qué trata: una sola línea, cortada en una palabra entera y con «…» si siguió.
export function extractoDeLegal(
  documento: DocumentoDelSitio,
  largo: number = LARGO_DEL_EXTRACTO_DE_LEGAL,
): string {
  const plano = documento.content
    .map(textoDeNodo)
    .filter((texto) => texto !== '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (plano.length <= largo) {
    return plano
  }
  const corte = plano.slice(0, largo)
  const espacio = corte.lastIndexOf(' ')
  return `${(espacio > largo / 2 ? corte.slice(0, espacio) : corte).trimEnd()}…`
}
