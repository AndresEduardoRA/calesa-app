// Por qué está apagado cada botón de «Compartir la cotización» (`null`: se puede). Un botón apagado siempre dice su motivo, debajo y sin repetirse
// (`aLaVista`, sólo los de los botones que se ofrecen). Lo que ya está en memoria se copia o se comparte sin red; lo que falta bajar, no.
import {
  MOTIVO_SIN_PORTAPAPELES,
  MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES,
  type Capacidades,
} from '@/shared/lib/compartir'

export const MOTIVO_SIN_RED = 'No hay conexión.'
export const MOTIVO_SIN_IMAGEN = 'La imagen todavía no está lista.'
export const MOTIVO_IMAGEN_FALLIDA = 'No se pudo armar la imagen.'
export const MOTIVO_SIN_TEXTO = 'El texto todavía no está listo.'
export const MOTIVO_SIN_FOTOS = 'Elige al menos una foto.'
export const MOTIVO_FOTOS_BAJANDO = 'Preparando las fotos…'
export const MOTIVO_UNA_SOLA_FOTO = 'Elige una sola foto para copiarla.'

export type EstadoDeLaParte = 'leyendo' | 'listo' | 'error'

// Qué imagen se comparte: la de la tarjeta de la cotización o las fotos marcadas del vehículo.
export type OpcionDeImagen = 'cotizacion' | 'fotos'

export type EntradaDeLosMotivos = {
  opcion: OpcionDeImagen
  imagen: EstadoDeLaParte
  // Las marcadas y, de ellas, cuántas ya están bajadas a tamaño completo.
  fotos: { marcadas: number; listas: number }
  texto: EstadoDeLaParte
  capacidades: Capacidades
  enLinea: boolean
}

export type MotivosDeCompartir = {
  compartir: string | null
  copiarImagen: string | null
  descargarImagen: string | null
  copiarTexto: string | null
  descargarPdf: string | null
  aLaVista: string[]
}

// Si los botones son los del celular (el menú del sistema con archivos: «Compartir», «Copiar texto», «Descargar PDF») o los del escritorio.
export const conMenuDelSistema = (capacidades: Capacidades) => capacidades.compartirArchivos

function motivoDeLaImagen(e: EntradaDeLosMotivos): string | null {
  if (e.opcion === 'fotos') {
    if (e.fotos.marcadas === 0) return MOTIVO_SIN_FOTOS
    if (e.fotos.listas < e.fotos.marcadas) return e.enLinea ? MOTIVO_FOTOS_BAJANDO : MOTIVO_SIN_RED
    return null
  }
  if (e.imagen === 'listo') return null
  if (e.imagen === 'error') return MOTIVO_IMAGEN_FALLIDA
  return e.enLinea ? MOTIVO_SIN_IMAGEN : MOTIVO_SIN_RED
}

// Copiar una imagen: la que está lista, una sola foto y un portapapeles que acepte imágenes.
function motivoDeCopiarImagen(e: EntradaDeLosMotivos, sinImagen: string | null): string | null {
  if (sinImagen !== null) return sinImagen
  if (e.opcion === 'fotos' && e.fotos.marcadas > 1) return MOTIVO_UNA_SOLA_FOTO
  return e.capacidades.portapapelesDeImagenes ? null : MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES
}

// El menú del sistema espera al texto y a lo que se manda; con la imagen de la tarjeta fallida manda sólo el texto (la falla ya está a la vista).
function motivoDeCompartir(
  e: EntradaDeLosMotivos,
  sinImagen: string | null,
  sinTexto: string | null,
) {
  if (sinTexto !== null) return sinTexto
  return e.opcion === 'cotizacion' && e.imagen === 'error' ? null : sinImagen
}

export function motivosDeCompartir(e: EntradaDeLosMotivos): MotivosDeCompartir {
  const sinImagen = motivoDeLaImagen(e)
  const sinTexto = e.texto === 'listo' ? null : MOTIVO_SIN_TEXTO
  const copiarTexto = sinTexto ?? (e.capacidades.portapapeles ? null : MOTIVO_SIN_PORTAPAPELES)
  const copiarImagen = motivoDeCopiarImagen(e, sinImagen)
  const compartir = motivoDeCompartir(e, sinImagen, sinTexto)
  const descargarPdf = e.enLinea ? null : MOTIVO_SIN_RED
  const ofrecidos = conMenuDelSistema(e.capacidades)
    ? [compartir, copiarTexto, descargarPdf]
    : [copiarImagen, sinImagen, copiarTexto, descargarPdf]
  return {
    compartir,
    copiarImagen,
    descargarImagen: sinImagen,
    copiarTexto,
    descargarPdf,
    aLaVista: [...new Set(ofrecidos.filter((m): m is string => m !== null))],
  }
}
