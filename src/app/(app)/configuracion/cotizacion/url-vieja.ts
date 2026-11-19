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
// - `?origen=` que no es suyo (o que no existe): la misma pestaña del primero, sin parámetros (eran de ese otro origen).
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

// Lo demás de la URL, sin `seccion` ni `origen`, con el primer valor de cada parámetro y en su orden.
function conservados(parametros: URLSearchParams): string {
  const resto = new URLSearchParams()
  for (const [nombre, valor] of parametros) {
    if (nombre !== 'seccion' && nombre !== 'origen' && !resto.has(nombre)) {
      resto.set(nombre, valor)
    }
  }
  return resto.toString()
}

// Un `?origen=` que vino y no es de los suyos, en una pestaña de un origen.
const deOtroOrigen = (clave: ClaveVieja, origen: string | null, acceso: AccesoDeCotizacion) =>
  DEL_ORIGEN[clave] !== undefined && origen !== null && !acceso.origenes.includes(origen)

export function destinoDeLaUrlVieja(
  parametros: URLSearchParams,
  acceso: AccesoDeCotizacion,
): string | null {
  const primera = CLAVES_VIEJAS.find((clave) => abre(clave, acceso))
  if (parametros.size === 0 || primera === undefined) {
    return null
  }
  const seccion = parametros.get('seccion')
  const pedida = esClaveVieja(seccion) ? seccion : null
  if (pedida !== null && !abre(pedida, acceso)) {
    return rutaDe(primera, null, acceso)
  }
  const clave = pedida ?? primera
  const origenPedido = parametros.get('origen')
  if (deOtroOrigen(clave, origenPedido, acceso)) {
    return rutaDe(clave, null, acceso)
  }
  const ruta = rutaDe(clave, origenPedido, acceso)
  const busqueda = conservados(parametros)
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
