// Los datos clave de un origen (docs/GLOSARIO.md): los hasta 4 datos, en orden, que la ficha de un vehículo de ese origen muestra primero.
// Cada uno es un dato común (una columna de `vehiculos`, por su nombre en snake_case) o un campo activo del origen (por su clave). Espejo
// de `_origen_datos_clave_error()` y `_origen_datos_clave_de_fabrica()`: el juego `casos-de-datos-clave.json` lo corren Vitest y `db:probar`.
import { z } from 'zod'
import type { TipoDeOrigen } from './origen'

export const TOPE_DE_DATOS_CLAVE = 4

// En el orden de `camposComunes()` de `vehiculos` (un test en `src/app` las compara: `origenes` no depende de `vehiculos`).
export const DATOS_COMUNES = [
  { clave: 'marca', etiqueta: 'Marca' },
  { clave: 'modelo', etiqueta: 'Modelo' },
  { clave: 'anio', etiqueta: 'Año' },
  { clave: 'vin', etiqueta: 'VIN' },
  { clave: 'categoria_id', etiqueta: 'Categoría' },
  { clave: 'kilometraje', etiqueta: 'Kilometraje' },
  { clave: 'placado', etiqueta: 'Placado' },
  { clave: 'lote', etiqueta: 'Lote', soloSubasta: true },
  { clave: 'plataforma', etiqueta: 'Plataforma', soloSubasta: true },
  { clave: 'url_origen', etiqueta: 'Enlace de la subasta', soloSubasta: true },
] as const satisfies readonly { clave: string; etiqueta: string; soloSubasta?: true }[]

export type DatoComun = (typeof DATOS_COMUNES)[number]
export type ClaveComunDeDatoClave = DatoComun['clave']

const CLAVES_COMUNES = DATOS_COMUNES.map((dato) => dato.clave) as [
  ClaveComunDeDatoClave,
  ...ClaveComunDeDatoClave[],
]

export type DatoClave = { comun: ClaveComunDeDatoClave } | { campo: string }

const esquemaDatoClave = z.union([
  z.strictObject({ comun: z.enum(CLAVES_COMUNES) }),
  z.strictObject({ campo: z.string().min(1).max(40) }),
])

export const esquemaDatosClave = z.array(esquemaDatoClave).max(TOPE_DE_DATOS_CLAVE)

// Lo que viene de la columna, leído sin romper la pantalla: un elemento que no es un dato clave conocido se descarta (la base valida al
// escribir por la RPC; esto cubre una fila escrita a mano).
export function datosClaveDesde(valor: unknown): DatoClave[] {
  if (!Array.isArray(valor)) {
    return []
  }
  return valor
    .flatMap((elemento: unknown) => {
      const leido = esquemaDatoClave.safeParse(elemento)
      return leido.success ? [leido.data] : []
    })
    .slice(0, TOPE_DE_DATOS_CLAVE)
}

// Los datos comunes que lleva un origen de ese tipo (el lote, la plataforma y el enlace sólo en subasta).
export function datosComunesDe(tipo: TipoDeOrigen): DatoComun[] {
  return DATOS_COMUNES.filter((dato) => tipo === 'subasta' || !('soloSubasta' in dato))
}

export const DATOS_CLAVE_DE_FABRICA: Record<TipoDeOrigen, readonly DatoClave[]> = {
  subasta: [
    { comun: 'plataforma' },
    { comun: 'url_origen' },
    { comun: 'kilometraje' },
    { comun: 'anio' },
  ],
  manual: [
    { comun: 'anio' },
    { comun: 'kilometraje' },
    { comun: 'vin' },
    { comun: 'categoria_id' },
  ],
}

export const MENSAJE_TOPE_DE_DATOS_CLAVE = 'Ya hay 4 datos clave: quita uno para sumar este.'

export type CodigoDeDatosClave =
  'forma' | 'tope' | 'repetido' | 'comun_desconocido' | 'solo_subasta' | 'campo_inactivo'

export type ErrorDeDatosClave = { codigo: CodigoDeDatosClave; mensaje: string }

const MENSAJES: Record<CodigoDeDatosClave, string> = {
  forma: 'Los datos clave no tienen la forma esperada.',
  tope: MENSAJE_TOPE_DE_DATOS_CLAVE,
  repetido: 'Un dato clave está repetido.',
  comun_desconocido: 'Ese dato común no existe.',
  solo_subasta: 'Ese dato sólo existe en un origen de subasta.',
  campo_inactivo:
    'Uno de los campos elegidos ya no está activo en este origen. Recarga para ver los de ahora.',
}

const error = (codigo: CodigoDeDatosClave): ErrorDeDatosClave => ({
  codigo,
  mensaje: MENSAJES[codigo],
})

// Como `_origen_dato_clave_bien_formado()`: una sola clave, `comun` o `campo`, con un texto de 1 a 40 caracteres (puntos de código,
// como `char_length`).
function bienFormado(elemento: unknown): elemento is { comun: string } | { campo: string } {
  if (typeof elemento !== 'object' || elemento === null || Array.isArray(elemento)) {
    return false
  }
  const claves = Object.keys(elemento)
  if (claves.length !== 1 || (claves[0] !== 'comun' && claves[0] !== 'campo')) {
    return false
  }
  const valor: unknown = Reflect.get(elemento, claves[0])
  return typeof valor === 'string' && [...valor].length >= 1 && [...valor].length <= 40
}

const claveDe = (dato: { comun: string } | { campo: string }) =>
  'comun' in dato ? `comun:${dato.comun}` : `campo:${dato.campo}`

// Por qué una lista no sirve para un origen de ese tipo con esos campos activos, o null. El mismo orden y los mismos textos que la base.
export function errorDeDatosClave(
  tipo: TipoDeOrigen,
  datos: unknown,
  camposActivos: readonly string[],
): ErrorDeDatosClave | null {
  if (!Array.isArray(datos) || !datos.every(bienFormado)) {
    return error('forma')
  }
  const lista: ({ comun: string } | { campo: string })[] = datos
  if (lista.length > TOPE_DE_DATOS_CLAVE) {
    return error('tope')
  }
  if (new Set(lista.map(claveDe)).size !== lista.length) {
    return error('repetido')
  }
  const comunes = lista.flatMap((dato) => ('comun' in dato ? [dato.comun] : []))
  const todas: readonly string[] = CLAVES_COMUNES
  if (comunes.some((clave) => !todas.includes(clave))) {
    return error('comun_desconocido')
  }
  const delTipo: readonly string[] = datosComunesDe(tipo).map((dato) => dato.clave)
  if (comunes.some((clave) => !delTipo.includes(clave))) {
    return error('solo_subasta')
  }
  if (lista.some((dato) => 'campo' in dato && !camposActivos.includes(dato.campo))) {
    return error('campo_inactivo')
  }
  return null
}

// Un dato clave como lo dibuja la ficha: con su etiqueta y de dónde sale. `campoId` es el del campo en `origenes_campos`.
export type DatoClaveResuelto =
  | { de: 'comun'; clave: ClaveComunDeDatoClave; etiqueta: string }
  | { de: 'campo'; clave: string; etiqueta: string; campoId: string }

export type CampoParaResolver = { id: string; clave: string; etiqueta: string }

// La lista que muestra la ficha: la guardada o, vacía, la de fábrica del tipo. Un campo que ya no está activo se descarta (la base lo quita
// al desactivarlo; esto es por si acaso).
export function resolverDatosClave(
  tipo: TipoDeOrigen,
  guardados: readonly DatoClave[],
  camposActivos: readonly CampoParaResolver[],
): DatoClaveResuelto[] {
  const lista = guardados.length === 0 ? DATOS_CLAVE_DE_FABRICA[tipo] : guardados
  return lista.flatMap((dato): DatoClaveResuelto[] => {
    if ('comun' in dato) {
      const comun = DATOS_COMUNES.find((otro) => otro.clave === dato.comun)
      return comun ? [{ de: 'comun', clave: comun.clave, etiqueta: comun.etiqueta }] : []
    }
    const campo = camposActivos.find((otro) => otro.clave === dato.campo)
    return campo
      ? [{ de: 'campo', clave: campo.clave, etiqueta: campo.etiqueta, campoId: campo.id }]
      : []
  })
}
