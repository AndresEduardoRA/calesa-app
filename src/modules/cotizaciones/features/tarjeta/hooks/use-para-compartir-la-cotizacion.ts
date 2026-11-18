'use client'

import { pngDesde } from '@/shared/lib/compartir'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  pedirLaPortadaParaCompartir,
  pedirLasFotos,
  pedirLosDatos,
} from '../../../areas/tarjeta/composicion-compartir.client'
import { useParteDeCompartir } from './use-parte-de-compartir'

// La portada lista para compartir: la URL del blob para mostrarla y el PNG que piden el portapapeles y el menú del sistema (armado antes del toque).
export type PortadaParaCompartir = { url: string; png: Blob }

const NO_SE_ARMO = 'No se pudo armar la imagen.'

async function leerLaPortada(
  id: string,
  senal: AbortSignal,
): Promise<Resultado<PortadaParaCompartir>> {
  const webp = await pedirLaPortadaParaCompartir(id, senal)
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

const soltarLaPortada = (portada: PortadaParaCompartir) => {
  URL.revokeObjectURL(portada.url)
}

// Lo que el panel «Compartir la cotización» pide, cada parte por su lado (si una falla, las otras siguen): los datos del texto y la portada, una vez por apertura
// mientras `activo` (con el Modo Live no se pide nada), y la lista de fotos sólo cuando se eligen («Fotos»).
export function useParaCompartirLaCotizacion(
  id: string,
  { activo, conFotos }: { activo: boolean; conFotos: boolean },
) {
  const datos = useParteDeCompartir((senal) => pedirLosDatos(id, senal), activo ? id : null)
  // La portada va a la par de los datos (es lo que más tarda); las fotos, sólo con acceso y al elegirlas.
  const portada = useParteDeCompartir(
    (senal) => leerLaPortada(id, senal),
    activo ? id : null,
    soltarLaPortada,
  )
  const fotos = useParteDeCompartir(
    (senal) => pedirLasFotos(id, senal),
    activo && conFotos && datos.parte.estado === 'listo' ? id : null,
  )
  return { datos, portada, fotos }
}
