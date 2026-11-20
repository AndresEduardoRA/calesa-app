'use client'

import { pngDesde } from '@/shared/lib/compartir'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  apilarImagenes,
  pedirLaImagenParaCompartir,
  pedirLasFotos,
  pedirLosDatos,
} from '../../../areas/tarjeta/composicion-compartir.client'
import type { DatosParaCompartir } from '../../../entities/tarjeta/compartir/datos-para-compartir'
import { useParteDeCompartir } from './use-parte-de-compartir'

// La imagen de la tarjeta lista para compartir: la URL del blob para mostrarla y el PNG que piden el portapapeles y el menú del sistema (armado antes del toque).
export type ImagenDeLaTarjetaParaCompartir = { url: string; png: Blob }

const NO_SE_ARMO = 'No se pudo armar la imagen.'

async function leerLaImagen(
  id: string,
  senal: AbortSignal,
): Promise<Resultado<ImagenDeLaTarjetaParaCompartir>> {
  const webp = await pedirLaImagenParaCompartir(id, senal)
  if (!webp.ok) {
    return webp
  }
  try {
    const png = await pngDesde(webp.data)
    return ok({ url: URL.createObjectURL(webp.data), png })
  } catch {
    return fallo('inesperado', NO_SE_ARMO)
  }
}

// Las dos imágenes de las hermanas, apiladas en el orden de las opciones (glosario: «Cotizaciones hermanas»): si una no llega, ninguna (no se ofrece una sola a medias).
async function leerLasDosImagenes(
  versiones: NonNullable<DatosParaCompartir['versiones']>,
  senal: AbortSignal,
): Promise<Resultado<ImagenDeLaTarjetaParaCompartir>> {
  const [a, b] = await Promise.all(
    versiones.map((v) => pedirLaImagenParaCompartir(v.cotizacionId, senal)),
  )
  if (!a?.ok) return a ?? fallo('inesperado', NO_SE_ARMO)
  if (!b?.ok) return b ?? fallo('inesperado', NO_SE_ARMO)
  try {
    const png = await apilarImagenes(a.data, b.data)
    return ok({ url: URL.createObjectURL(png), png })
  } catch {
    return fallo('inesperado', NO_SE_ARMO)
  }
}

const soltarLaImagen = (imagen: ImagenDeLaTarjetaParaCompartir) => {
  URL.revokeObjectURL(imagen.url)
}

// Lo que el panel «Compartir la cotización» pide, cada parte por su lado (si una falla, las otras siguen): los datos del texto y la imagen de la tarjeta, una vez por apertura
// mientras `activo` (con el Modo Live no se pide nada), y la lista de fotos sólo cuando se eligen («Fotos»).
export function useParaCompartirLaCotizacion(
  id: string,
  { activo, conFotos }: { activo: boolean; conFotos: boolean },
) {
  const datos = useParteDeCompartir((senal) => pedirLosDatos(id, senal), activo ? id : null)
  // La imagen va a la par de los datos (es lo que más tarda); las fotos, sólo con acceso y al elegirlas.
  const propia = useParteDeCompartir(
    (senal) => leerLaImagen(id, senal),
    activo ? id : null,
    soltarLaImagen,
  )
  const versiones = datos.parte.estado === 'listo' ? datos.parte.dato.versiones : undefined
  const apilada = useParteDeCompartir(
    (senal) =>
      versiones
        ? leerLasDosImagenes(versiones, senal)
        : Promise.resolve(fallo('inesperado', NO_SE_ARMO)),
    activo && versiones ? `${id}:par` : null,
    soltarLaImagen,
  )
  const imagen = versiones ? apilada : propia
  const fotos = useParteDeCompartir(
    (senal) => pedirLasFotos(id, senal),
    activo && conFotos && datos.parte.estado === 'listo' ? id : null,
  )
  return { datos, imagen, fotos }
}
