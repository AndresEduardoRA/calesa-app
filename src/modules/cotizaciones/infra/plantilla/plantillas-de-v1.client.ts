// Lo que el modal «Empezar desde una plantilla» pide desde el navegador, con la sesión de quien configura: la ruta de `src/app` arma las cuatro plantillas con lo
// que tiene el origen. Un `fetch` sin caché ni redirección, con textos propios: un 404 es que ya no configura el origen, una redirección la sesión vencida y un
// pedido que no llegó, sin conexión.
import { MENSAJE_SIN_CONEXION, fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  esquemaDeDatosDePlantillasDeV1,
  type DatosDePlantillasDeV1,
} from '../../entities/plantilla/datos-de-plantillas-de-v1'

export const NO_SE_LEYERON = 'No se pudieron leer las plantillas.'
const SIN_ACCESO = 'Ya no configuras este origen.'
const SESION_QUE_NO_VALE = 'Tu sesión ya no vale: vuelve a entrar.'

// La ruta se queda donde estaba, fuera de la página del origen: hasta chore/quitar-plantillas-de-v1.
export const rutaDePlantillasDeV1 = (origenId: string) =>
  `/configuracion/cotizacion/${encodeURIComponent(origenId)}/plantillas-de-v1`

export async function pedirPlantillasDeV1(
  origenId: string,
  senal?: AbortSignal,
): Promise<Resultado<DatosDePlantillasDeV1>> {
  let respuesta: Response
  try {
    respuesta = await fetch(rutaDePlantillasDeV1(origenId), {
      redirect: 'manual',
      cache: 'no-store',
      ...(senal === undefined ? {} : { signal: senal }),
    })
  } catch {
    return fallo('inesperado', MENSAJE_SIN_CONEXION)
  }
  if (respuesta.type === 'opaqueredirect' || (respuesta.status >= 300 && respuesta.status < 400)) {
    return fallo('no_autenticado', SESION_QUE_NO_VALE)
  }
  if (respuesta.status === 404) return fallo('sin_permiso', SIN_ACCESO)
  if (!respuesta.ok) return fallo('inesperado', NO_SE_LEYERON)
  try {
    const leido = esquemaDeDatosDePlantillasDeV1.safeParse(await respuesta.json())
    return leido.success ? ok(leido.data) : fallo('inesperado', NO_SE_LEYERON)
  } catch {
    return fallo('inesperado', NO_SE_LEYERON)
  }
}
