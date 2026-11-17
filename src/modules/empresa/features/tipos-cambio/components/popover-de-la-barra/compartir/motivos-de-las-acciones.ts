import {
  MOTIVO_NINGUN_TIPO_PARA_COMPARTIR,
  MOTIVO_SIN_PORTAPAPELES,
  MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES,
} from '../../../../../entities/compartir-tipos-cambio'
import type { Parte } from '../../../hooks/use-para-compartir'
import type { Capacidades } from './navegador'

export const MOTIVO_SIN_IMAGEN = 'La imagen todavía no está lista.'
export const MOTIVO_SIN_TEXTO = 'El texto todavía no está listo.'

// Por qué está apagado cada botón (`null`: se puede): todavía no llegó lo que se comparte, no hay tipos elegidos o el navegador no lo permite. Un botón apagado
// siempre dice su motivo.
export type MotivosDeLasAcciones = {
  compartir: string | null
  copiarTexto: string | null
  copiarImagen: string | null
  descargar: string | null
  // Los de arriba, sin repetir y sin los de un botón que no se ofrece.
  aLaVista: string[]
}

// Lo que falta para tener una parte (el texto o la imagen): nada elegido, o todavía no llegó.
function motivoDeLaParte(parte: Parte<unknown>, sinElegir: boolean, sinLlegar: string) {
  if (sinElegir) {
    return MOTIVO_NINGUN_TIPO_PARA_COMPARTIR
  }
  return parte.estado === 'listo' ? null : sinLlegar
}

export function motivosDeLasAcciones(
  imagen: Parte<unknown>,
  texto: Parte<unknown>,
  sinElegir: boolean,
  capacidades: Capacidades,
): MotivosDeLasAcciones {
  const sinImagen = motivoDeLaParte(imagen, sinElegir, MOTIVO_SIN_IMAGEN)
  const sinTexto = motivoDeLaParte(texto, sinElegir, MOTIVO_SIN_TEXTO)
  const copiarTexto = sinTexto ?? (capacidades.portapapeles ? null : MOTIVO_SIN_PORTAPAPELES)
  const copiarImagen =
    sinImagen ?? (capacidades.portapapelesDeImagenes ? null : MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES)
  // El menú del sistema espera a la imagen (o a que falle: entonces comparte sólo el texto, y la falla ya está a la vista).
  const compartir = sinTexto ?? (imagen.estado === 'leyendo' ? MOTIVO_SIN_IMAGEN : null)
  const delSistema = capacidades.compartirDelSistema
  const ofrecidos = [delSistema ? compartir : copiarImagen, copiarTexto, sinImagen]
  return {
    compartir,
    copiarTexto,
    copiarImagen,
    descargar: sinImagen,
    aLaVista: [...new Set(ofrecidos.filter((motivo) => motivo !== null))],
  }
}
