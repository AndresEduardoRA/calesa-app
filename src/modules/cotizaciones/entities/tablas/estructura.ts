// La estructura de una tabla de referencia (docs/COTIZADOR.md › «Crear, columnas y desactivar»): los tipos de columna, los topes y las claves. La
// clave de la tabla la calcula la base desde el nombre (`_tabla_referencia_clave()`) y no cambia: `claveDeLaTabla` es su espejo exacto, para
// mostrarla mientras se tipea. La de una columna la manda la pantalla: sale de la etiqueta mientras la persona no la toca.
import { claveDeTexto } from '@/shared/lib/campos/clave'
import { TOPE_DE_TABLAS } from './lectura'

export const TIPOS_DE_COLUMNA = ['numero', 'anio', 'texto'] as const
export type TipoDeColumna = (typeof TIPOS_DE_COLUMNA)[number]

export const ETIQUETA_DEL_TIPO: Record<TipoDeColumna, string> = {
  numero: 'Número',
  anio: 'Año',
  texto: 'Texto',
}

export function esTipoDeColumna(tipo: string): tipo is TipoDeColumna {
  return (TIPOS_DE_COLUMNA as readonly string[]).includes(tipo)
}

export const TOPE_DE_COLUMNAS = 20
export const LARGO_MAXIMO_DEL_NOMBRE = 80
export const LARGO_MAXIMO_DE_LA_ETIQUETA = 60
// Un origen recibe hasta 100 tablas activas, propias y compartidas: las que dibuja la lista y ofrece el catálogo de BUSCARV.
export const TOPE_DE_TABLAS_POR_ORIGEN = TOPE_DE_TABLAS
const LARGO_MAXIMO_DE_LA_CLAVE = 40

export const AVISO_DEL_TOPE_DE_TABLAS = `Ya hay ${TOPE_DE_TABLAS_POR_ORIGEN} tablas, que es el máximo: desactiva una que ninguna fórmula use.`
export const AVISO_DEL_TOPE_DE_COLUMNAS = `Una tabla tiene hasta ${TOPE_DE_COLUMNAS} columnas.`
export const AYUDA_DE_LOS_TRAMOS =
  'Para buscar por rango (BUSCARV con VERDADERO) la tabla necesita las columnas «desde» y «hasta».'
export const AVISO_DE_COMPARTIDA =
  'Compartida: cambiar sus columnas pide que configures cada origen que la usa.'
export const AVISO_DE_QUITAR = 'Quitar una columna borra sus valores de todas las filas.'
export const AVISO_CON_CAMBIOS_DE_FILAS =
  'Publica o descarta los cambios de las filas para cambiar las columnas.'
export const AVISO_CON_CAMBIOS_DE_FILAS_AL_DESACTIVAR =
  'Publica o descarta los cambios de las filas para desactivar la tabla.'
export const SIN_CAMBIOS_EN_LAS_COLUMNAS = 'Sin cambios en las columnas.'
export const DESCRIPCION_DE_DESACTIVAR =
  'Deja de ofrecerse a las fórmulas; sus filas se conservan y su clave no se vuelve a usar. No se deshace desde aquí.'

// Las vocales con acento en las dos cajas, la ñ y la ç: el mismo `translate` de la base.
const DE = 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ'
const A = 'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'
const TRADUCCION = new Map([...DE].map((letra, i) => [letra, A[i] ?? '']))

// Espejo de `_tabla_referencia_clave()`: minúsculas sólo ASCII (`lower(… collate "C")`), las letras con acento por su base, todo lo que no es
// [a-z0-9] a un `_`, sin `_` en los bordes, `t_` si empieza con un dígito y hasta 40. Nulo donde la base da 22023 (menos de dos letras o números).
export function claveDeLaTabla(nombre: string): string | null {
  const minusculas = nombre.replace(/[A-Z]/g, (letra) => letra.toLowerCase())
  const traducida = [...minusculas].map((letra) => TRADUCCION.get(letra) ?? letra).join('')
  let clave = traducida
    .replace(/[^abcdefghijklmnopqrstuvwxyz0123456789]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (/^[0123456789]/.test(clave)) clave = `t_${clave}`
  clave = clave.slice(0, LARGO_MAXIMO_DE_LA_CLAVE).replace(/_+$/, '')
  return clave.length < 2 ? null : clave
}

// La clave de una columna nueva sacada de su etiqueta, con un sufijo `_2`… si choca con otra de la tabla.
export function claveDeColumna(etiqueta: string, tomadas: readonly string[]): string {
  const base = claveDeTexto(etiqueta, LARGO_MAXIMO_DE_LA_CLAVE - 3, {
    prefijo: 'c_',
    vacio: 'columna',
  })
  const usadas = new Set(tomadas)
  if (!usadas.has(base)) return base
  for (let n = 2; n < 100; n += 1) {
    const candidata = `${base}_${n}`
    if (!usadas.has(candidata)) return candidata
  }
  return `${base}_${usadas.size + 1}`
}
