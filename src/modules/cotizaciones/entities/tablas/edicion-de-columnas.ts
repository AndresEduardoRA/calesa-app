// El editor de las columnas de una tabla de referencia (docs/COTIZADOR.md › «Crear, columnas y desactivar»), puro: lo usan «Nueva tabla» y «Columnas». Una
// columna que ya existe sólo cambia de nombre (la etiqueta), de lugar o se marca «Se quita» (con «No quitar»); su clave y su tipo no cambian. Una nueva elige
// todo: su clave sigue a la etiqueta mientras la persona no la toca. Lo que se manda es la lista entera en su orden, sin las que se quitan.
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import { TOPE_DE_COLUMNAS, claveDeColumna, type TipoDeColumna } from './estructura'
import { normalizarColumnas, sinEspaciosEnLosBordes } from './validacion-de-columnas'

export type ColumnaEnEdicion = {
  // La llave estable de la fila (React y las acciones): no es la clave, que en una nueva cambia al tipear.
  llave: string
  clave: string
  etiqueta: string
  tipo: string
  nueva: boolean
  claveTocada: boolean
  seQuita: boolean
}

export type EdicionDeColumnas = { columnas: ColumnaEnEdicion[]; siguiente: number }

export type AccionDeColumnas =
  | { tipo: 'sumar' }
  | { tipo: 'quitar'; llave: string }
  | { tipo: 'no_quitar'; llave: string }
  | { tipo: 'mover'; llave: string; hacia: -1 | 1 }
  | { tipo: 'escribir_etiqueta'; llave: string; etiqueta: string }
  | { tipo: 'escribir_clave'; llave: string; clave: string }
  | { tipo: 'elegir_tipo'; llave: string; tipoDeColumna: TipoDeColumna }

export const TIPO_DE_UNA_COLUMNA_NUEVA: TipoDeColumna = 'numero'

function columnaNueva(llave: string): ColumnaEnEdicion {
  return {
    llave,
    clave: claveDeColumna('', []),
    etiqueta: '',
    tipo: TIPO_DE_UNA_COLUMNA_NUEVA,
    nueva: true,
    claveTocada: false,
    seQuita: false,
  }
}

// Las columnas de una tabla que ya existe, tal como están.
export function edicionDeLasColumnas(columnas: readonly ColumnaDeTabla[]): EdicionDeColumnas {
  return {
    columnas: columnas.map((c, i) => ({
      llave: `e${i}`,
      clave: c.clave,
      etiqueta: c.etiqueta,
      tipo: c.tipo,
      nueva: false,
      claveTocada: true,
      seQuita: false,
    })),
    siguiente: 0,
  }
}

// Una tabla nueva nace con una columna vacía.
export function edicionDeUnaTablaNueva(): EdicionDeColumnas {
  return { columnas: [columnaNueva('n0')], siguiente: 1 }
}

const vivas = (columnas: readonly ColumnaEnEdicion[]) => columnas.filter((c) => !c.seQuita)

export const puedeSumar = (edicion: EdicionDeColumnas) =>
  vivas(edicion.columnas).length < TOPE_DE_COLUMNAS

// No se quita la última que queda: una tabla tiene al menos una columna.
export const puedeQuitar = (edicion: EdicionDeColumnas) => vivas(edicion.columnas).length > 1

// La clave de una nueva sale de su etiqueta sin chocar con ninguna otra de la tabla (tampoco con las que se quitan: la base las vería como la misma).
function claveQueSigue(columnas: readonly ColumnaEnEdicion[], llave: string, etiqueta: string) {
  const tomadas = columnas.filter((c) => c.llave !== llave).map((c) => c.clave)
  return claveDeColumna(etiqueta, tomadas)
}

function cambiar(
  edicion: EdicionDeColumnas,
  llave: string,
  cambio: (columna: ColumnaEnEdicion) => ColumnaEnEdicion,
): EdicionDeColumnas {
  return { ...edicion, columnas: edicion.columnas.map((c) => (c.llave === llave ? cambio(c) : c)) }
}

function mover(edicion: EdicionDeColumnas, llave: string, hacia: -1 | 1): EdicionDeColumnas {
  const desde = edicion.columnas.findIndex((c) => c.llave === llave)
  const hasta = desde + hacia
  const movida = edicion.columnas[desde]
  if (desde < 0 || hasta < 0 || hasta >= edicion.columnas.length || !movida) return edicion
  const columnas = edicion.columnas.filter((c) => c.llave !== llave)
  columnas.splice(hasta, 0, movida)
  return { ...edicion, columnas }
}

function quitar(edicion: EdicionDeColumnas, llave: string): EdicionDeColumnas {
  const columna = edicion.columnas.find((c) => c.llave === llave)
  if (!columna || columna.seQuita || !puedeQuitar(edicion)) return edicion
  if (columna.nueva)
    return { ...edicion, columnas: edicion.columnas.filter((c) => c.llave !== llave) }
  return cambiar(edicion, llave, (c) => ({ ...c, seQuita: true }))
}

function sumar(edicion: EdicionDeColumnas): EdicionDeColumnas {
  if (!puedeSumar(edicion)) return edicion
  const nueva = columnaNueva(`n${edicion.siguiente}`)
  const clave = claveQueSigue(edicion.columnas, nueva.llave, '')
  return { columnas: [...edicion.columnas, { ...nueva, clave }], siguiente: edicion.siguiente + 1 }
}

export function editarColumnas(
  edicion: EdicionDeColumnas,
  accion: AccionDeColumnas,
): EdicionDeColumnas {
  switch (accion.tipo) {
    case 'sumar':
      return sumar(edicion)
    case 'quitar':
      return quitar(edicion, accion.llave)
    case 'no_quitar':
      // Volver a dejarla no puede pasar el tope.
      return puedeSumar(edicion)
        ? cambiar(edicion, accion.llave, (c) => ({ ...c, seQuita: false }))
        : edicion
    case 'mover':
      return mover(edicion, accion.llave, accion.hacia)
    case 'escribir_etiqueta':
      return cambiar(edicion, accion.llave, (c) => ({
        ...c,
        etiqueta: accion.etiqueta,
        clave:
          c.nueva && !c.claveTocada
            ? claveQueSigue(edicion.columnas, c.llave, accion.etiqueta)
            : c.clave,
      }))
    case 'escribir_clave':
      return cambiar(edicion, accion.llave, (c) =>
        c.nueva ? { ...c, clave: accion.clave, claveTocada: true } : c,
      )
    case 'elegir_tipo':
      return cambiar(edicion, accion.llave, (c) =>
        c.nueva ? { ...c, tipo: accion.tipoDeColumna } : c,
      )
  }
}

// La lista que se manda: en su orden, sin las que se quitan, con la etiqueta sin espacios en los bordes (como la guarda la base).
export function columnasParaEnviar(edicion: EdicionDeColumnas): ColumnaDeTabla[] {
  return vivas(edicion.columnas).map((c) => ({
    clave: c.clave,
    etiqueta: sinEspaciosEnLosBordes(c.etiqueta),
    tipo: c.tipo,
  }))
}

const igualesEnOrden = (a: readonly ColumnaDeTabla[], b: readonly ColumnaDeTabla[]) =>
  a.length === b.length &&
  a.every((c, i) => {
    const otra = b.at(i)
    return (
      otra !== undefined &&
      c.clave === otra.clave &&
      c.etiqueta === otra.etiqueta &&
      c.tipo === otra.tipo
    )
  })

// Si lo que se mandaría es otra cosa que lo que la tabla tiene (la base dice «Las columnas no cambiaron.» si no).
export function hayCambios(edicion: EdicionDeColumnas, originales: readonly ColumnaDeTabla[]) {
  return !igualesEnOrden(columnasParaEnviar(edicion), normalizarColumnas(originales))
}

function cuantas(n: number, singular: string, plural: string) {
  return `${n === 1 ? singular : plural} ${n}`
}

// «Se suma 1 · se renombra 1 · se quita 1 · cambia el orden»: lo que va a pasar al guardar, sin cambios vacío.
export function resumenDeLosCambios(
  edicion: EdicionDeColumnas,
  originales: readonly ColumnaDeTabla[],
): string {
  const antes = new Map(normalizarColumnas(originales).map((c) => [c.clave, c]))
  const enviadas = columnasParaEnviar(edicion)
  const suman = enviadas.filter((c) => !antes.has(c.clave)).length
  const renombran = enviadas.filter((c) => {
    const vieja = antes.get(c.clave)
    return vieja !== undefined && vieja.etiqueta !== c.etiqueta
  }).length
  const quitan = edicion.columnas.filter((c) => c.seQuita).length
  const quedan = enviadas.filter((c) => antes.has(c.clave)).map((c) => c.clave)
  const ordenDeAntes = [...antes.keys()].filter((clave) => quedan.includes(clave))
  const partes = [
    suman > 0 ? cuantas(suman, 'se suma', 'se suman') : null,
    renombran > 0 ? cuantas(renombran, 'se renombra', 'se renombran') : null,
    quitan > 0 ? cuantas(quitan, 'se quita', 'se quitan') : null,
    quedan.some((clave, i) => ordenDeAntes[i] !== clave) ? 'cambia el orden' : null,
  ].filter((p): p is string => p !== null)
  const texto = partes.join(' · ')
  return texto === '' ? '' : texto.charAt(0).toUpperCase() + texto.slice(1)
}
