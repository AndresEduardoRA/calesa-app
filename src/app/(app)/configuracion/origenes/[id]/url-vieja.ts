import { unParametro } from '@/shared/lib/rutas'
import {
  CLAVES_DE_PARTE_DEL_ORIGEN,
  rutaDeSubseccionDeOrigen,
  type ParteDelOrigen,
} from '../subsecciones'

// Lo que un enlace de antes podía traer y sigue abriendo lo suyo en la sub-ruta: el campo o la categoría abiertos y los paneles (`?panel=`).
const PARAMETROS_QUE_SE_CONSERVAN = ['campo', 'categoria', 'panel'] as const

// A dónde lleva `/configuracion/origenes/<id>` con lo que traiga: `?seccion=` elige la parte; sin ella (o desconocida), un `?campo=`
// abierto lleva a «Campos», una `?categoria=` a «Categorías» y lo demás a «Datos». Nunca vuelve a `/<id>` sin parte (no redirige dos veces).
export function destinoDeLaUrlVieja(
  id: string,
  parametros: Record<string, string | string[] | undefined>,
): string {
  const seccion = unParametro(parametros['seccion'])
  const elegida = CLAVES_DE_PARTE_DEL_ORIGEN.find((clave) => clave === seccion)
  const parte: ParteDelOrigen =
    elegida ??
    (unParametro(parametros['campo'])
      ? 'campos'
      : unParametro(parametros['categoria'])
        ? 'categorias'
        : 'datos')
  const conservados = new URLSearchParams()
  for (const clave of PARAMETROS_QUE_SE_CONSERVAN) {
    const valor = unParametro(parametros[clave])
    if (valor) {
      conservados.set(clave, valor)
    }
  }
  const consulta = conservados.toString()
  return `${rutaDeSubseccionDeOrigen(parte, id)}${consulta === '' ? '' : `?${consulta}`}`
}
