import {
  RUTAS,
  rutaDeConfiguracionDeCotizacion,
  type PestanaDeCotizacion,
} from '@/shared/lib/rutas'
import type { AccesoDeCotizacion } from './acceso'

// Configuración › Cotización era una página con pestañas (`?seccion=`, `?origen=`). El inicio manda cada enlace de antes a su sub-ruta:
// - Sin ningún parámetro: null (el inicio).
// - `?seccion=` que la persona abre: a su sub-ruta, del `?origen=` pedido si es suyo o del primero, con todos los demás parámetros en su
//   orden (`?panel=`, `?version=`, `?tabla=`, `?tono=`, `?nivel=`, `?vista=`…): ningún enlace profundo se pierde.
// - Sin `seccion` (con otros parámetros) o con una desconocida: a la primera de antes que abre, con los demás parámetros.
// - `seccion` de una que no abre: a la primera de antes que abre, sin parámetros (eran de otra parte).
// - Sin ninguna: null (la página decide).
// El destino nunca lleva `seccion` ni `origen`: no redirige dos veces.

// Las pestañas de antes, en su orden (la primera que se podía abrir era la de por defecto). `colores` es el nombre que también se acepta para `tonos`.
export const CLAVES_VIEJAS = [
  'niveles',
  'formula',
  'tarjeta',
  'diseno',
  'tonos',
  'tablas',
  'ajustes',
] as const

type ClaveVieja = (typeof CLAVES_VIEJAS)[number] | 'colores'

const DEL_ORIGEN: Partial<Record<ClaveVieja, PestanaDeCotizacion>> = {
  formula: 'formula',
  diseno: 'hoja',
  tarjeta: 'tarjeta',
  tablas: 'tablas',
}

const GENERAL: Partial<Record<ClaveVieja, string>> = {
  tonos: RUTAS.coloresDeCotizacion,
  colores: RUTAS.coloresDeCotizacion,
  niveles: RUTAS.nivelesDeCotizacion,
  ajustes: RUTAS.vigenciaDeCotizacion,
}

const esClaveVieja = (valor: string | null): valor is ClaveVieja =>
  valor === 'colores' || (CLAVES_VIEJAS as readonly (string | null)[]).includes(valor)

const abre = (clave: ClaveVieja, acceso: AccesoDeCotizacion) =>
  clave === 'niveles' ? acceso.veNiveles : acceso.configura

function rutaDe(
  clave: ClaveVieja,
  origenPedido: string | null,
  acceso: AccesoDeCotizacion,
): string {
  const pestana = DEL_ORIGEN[clave]
  if (pestana === undefined) {
    return GENERAL[clave] ?? RUTAS.coloresDeCotizacion
  }
  const origen = acceso.origenes.find((id) => id === origenPedido) ?? acceso.origenes[0] ?? null
  return origen === null
    ? RUTAS.coloresDeCotizacion
    : rutaDeConfiguracionDeCotizacion(origen, pestana)
}

export function destinoDeLaUrlVieja(
  parametros: URLSearchParams,
  acceso: AccesoDeCotizacion,
): string | null {
  if (parametros.size === 0) {
    return null
  }
  const seccion = parametros.get('seccion')
  const pedida = esClaveVieja(seccion) ? seccion : null
  const primera = CLAVES_VIEJAS.find((clave) => abre(clave, acceso))
  if (primera === undefined) {
    return null
  }
  const origenPedido = parametros.get('origen')
  if (pedida !== null && !abre(pedida, acceso)) {
    return rutaDe(primera, null, acceso)
  }
  const resto = new URLSearchParams()
  for (const [nombre, valor] of parametros) {
    if (nombre !== 'seccion' && nombre !== 'origen' && !resto.has(nombre)) {
      resto.set(nombre, valor)
    }
  }
  const ruta = rutaDe(pedida ?? primera, origenPedido, acceso)
  const busqueda = resto.toString()
  return busqueda === '' ? ruta : `${ruta}?${busqueda}`
}

// Los `searchParams` de una página, como `URLSearchParams`: cada valor, también los que se repiten.
export function busquedaDe(
  parametros: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const busqueda = new URLSearchParams()
  for (const [nombre, valor] of Object.entries(parametros)) {
    for (const uno of Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]) {
      busqueda.append(nombre, uno)
    }
  }
  return busqueda
}

// Lo mismo con el primer valor de cada parámetro, para pasarlo a `rutaDeConfiguracionDeCotizacion()`.
export function consultaDe(
  parametros: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const consulta: Record<string, string> = {}
  for (const [nombre, valor] of busquedaDe(parametros)) {
    consulta[nombre] ??= valor
  }
  return consulta
}
