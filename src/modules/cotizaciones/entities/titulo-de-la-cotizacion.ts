// El título de la cotización (docs/GLOSARIO.md › «Título de la cotización»): automático (el del vehículo) o manual. La base decide el que se guarda
// (`cotizacion_crear`, `cotizacion_guardar`); este archivo es su espejo en el navegador y la única regla de lo que se muestra cuando falta. Puro: viaja al navegador.

// Lo que la base acepta (`cotizacion_crear` y `cotizacion_guardar`: 22023 `titulo_largo`), contado en puntos de código como `char_length`.
export const TOPE_DEL_TITULO = 120

// El contador del campo aparece desde aquí.
export const AVISO_DEL_TOPE_DEL_TITULO = 100

// `btrim` de Postgres sin segundo argumento: sólo quita U+0020 a los costados. Vacío = sin título.
export function limpiarTitulo(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined) {
    return null
  }
  const limpio = texto.replace(/^ +| +$/g, '')
  return limpio === '' ? null : limpio
}

// Cuántos caracteres cuenta la base (`char_length`: puntos de código, no unidades UTF-16).
export const largoDelTitulo = (texto: string): number => Array.from(texto).length

// El título automático: el del vehículo sin espacios a los costados, cortado a 120 puntos de código y otra vez sin espacios (espejo de
// `nullif(btrim(left(btrim(v.titulo), 120)), '')`). Sin vehículo, ninguno.
export function tituloAutomatico(vehiculo: string | null | undefined): string | null {
  const limpio = limpiarTitulo(vehiculo)
  return limpio === null
    ? null
    : limpiarTitulo(Array.from(limpio).slice(0, TOPE_DEL_TITULO).join(''))
}

export type FuenteDelTitulo = 'titulo' | 'vehiculo' | 'numero'

export type TituloMostrado = { texto: string; fuente: FuenteDelTitulo }

// Cómo se nombra una cotización en toda superficie (lista, resumen, cabecera, tarjeta, PDF, buscador): su título; si no tiene (una vieja que nadie guardó), el
// de su vehículo; si tampoco, «Cotización n.º N». `fuente` deja a cada superficie no repetir el número o el vehículo que ya muestra. Sin nada (la hoja nueva sin
// vehículo ni título), nulo.
export function tituloDeLaCotizacion({
  titulo,
  vehiculo,
  numero,
}: {
  titulo: string | null
  vehiculo: string | null
  numero: number | null
}): TituloMostrado | null {
  const propio = limpiarTitulo(titulo)
  if (propio !== null) {
    return { texto: propio, fuente: 'titulo' }
  }
  const delVehiculo = tituloAutomatico(vehiculo)
  if (delVehiculo !== null) {
    return { texto: delVehiculo, fuente: 'vehiculo' }
  }
  return numero === null ? null : { texto: `Cotización n.º ${String(numero)}`, fuente: 'numero' }
}

// Lo que la tarjeta y el PDF ponen junto al número: el título si no es el mismo número («Cotización n.º N» ya está escrito al lado).
export const tituloAparteDelNumero = (titulo: TituloMostrado | null): string | null =>
  titulo === null || titulo.fuente === 'numero' ? null : titulo.texto

// El título que se edita: el texto tal como se escribe (los espacios se quitan al guardar) y si es manual. Automático = sin texto propio.
export type EstadoDelTitulo = { texto: string; manual: boolean }

export const TITULO_AUTOMATICO: EstadoDelTitulo = { texto: '', manual: false }

// El estado con que abre una guardada: manual sólo si lo es y tiene texto.
export function estadoDelTituloGuardado(titulo: string | null, manual: boolean): EstadoDelTitulo {
  const limpio = limpiarTitulo(titulo)
  return manual && limpio !== null ? { texto: limpio, manual: true } : TITULO_AUTOMATICO
}

// Escribir en el campo: con texto, manual; vacío o sólo espacios, vuelve a automático.
export function alEscribirElTitulo(texto: string): EstadoDelTitulo {
  return limpiarTitulo(texto) === null ? TITULO_AUTOMATICO : { texto, manual: true }
}

// El título que se ve (la barra, la tarjeta, lo que falta): el manual, o el del vehículo elegido.
export function tituloMostrado(estado: EstadoDelTitulo, vehiculo: string | null): string | null {
  return estado.manual ? limpiarTitulo(estado.texto) : tituloAutomatico(vehiculo)
}

// Lo que va en el pedido: el texto sólo si es manual (el automático lo pone la base con el vehículo de la cotización).
export function tituloParaGuardar(estado: EstadoDelTitulo): {
  titulo: string | null
  tituloManual: boolean
} {
  const limpio = estado.manual ? limpiarTitulo(estado.texto) : null
  return limpio === null
    ? { titulo: null, tituloManual: false }
    : { titulo: limpio, tituloManual: true }
}

// Si lo que se edita difiere de lo guardado: otro modo, o manual con otro texto.
export function tituloCambio(estado: EstadoDelTitulo, guardado: EstadoDelTitulo): boolean {
  const a = tituloParaGuardar(estado)
  const b = tituloParaGuardar(guardado)
  return a.tituloManual !== b.tituloManual || a.titulo !== b.titulo
}
