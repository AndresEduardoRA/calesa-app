import type { RespuestaDeRecalculo } from './recalculo'

// Los pasos de la hoja (docs/GLOSARIO.md › «Pasos de la hoja»): la fila «Hoja · Vehículo · Cliente · Vista previa» de arriba de la hoja, como en V1. Cada paso abre su
// panel de hoy y lleva un punto de estado que nunca va sólo por color: su texto para el lector de pantalla y su `title`. Reglas puras, cero I/O.

export type ClaveDelPaso = 'hoja' | 'vehiculo' | 'cliente' | 'vista_previa'
export type PuntoDelPaso = 'elegido' | 'obligatorio_que_falta' | 'falta_un_dato'

// Lo que la página sabe de un panel que se elige (vehículo o cliente): su nombre en la URL (`?panel=`), si hay uno elegido y si es obligatorio. Nulo: el paso no se dibuja.
export type EleccionDelPaso = { panel: string; elegido: boolean; obligatorio: boolean } | null

export type PasoDeLaHoja = {
  clave: ClaveDelPaso
  etiqueta: string
  // El panel que abre (`?panel=`); nulo en «Hoja», que lleva a la primera celda.
  panel: string | null
  punto: PuntoDelPaso | null
  // Lo que dice el punto («elegido»), para el lector de pantalla; nulo sin punto.
  textoDelPunto: string | null
  // «Vehículo: elegido»; sin punto, la etiqueta.
  title: string
}

const TEXTOS: Record<PuntoDelPaso, string> = {
  elegido: 'elegido',
  obligatorio_que_falta: 'obligatorio que falta',
  falta_un_dato: 'falta un dato',
}

// El cálculo trae algún dato requerido sin valor (el punto de «Hoja»).
export const faltaUnDato = (respuesta: RespuestaDeRecalculo | null): boolean =>
  respuesta?.faltantes.some((f) => f.codigo === 'requerido_sin_valor') === true

const puntoDeLaEleccion = (e: NonNullable<EleccionDelPaso>): PuntoDelPaso | null =>
  e.elegido ? 'elegido' : e.obligatorio ? 'obligatorio_que_falta' : null

function paso(
  clave: ClaveDelPaso,
  etiqueta: string,
  panel: string | null,
  punto: PuntoDelPaso | null,
): PasoDeLaHoja {
  const textoDelPunto = punto === null ? null : TEXTOS[punto]
  return {
    clave,
    etiqueta,
    panel,
    punto,
    textoDelPunto,
    title: textoDelPunto === null ? etiqueta : `${etiqueta}: ${textoDelPunto}`,
  }
}

// Los pasos, en el orden de V1: «Hoja» siempre; «Vehículo» y «Cliente» si la página les dio panel; «Vista previa» si la hoja la tiene (el proveedor de la tarjeta).
export function pasosDeLaHoja({
  faltaUnDato: falta,
  vehiculo,
  cliente,
  vistaPrevia,
}: {
  faltaUnDato: boolean
  vehiculo: EleccionDelPaso
  cliente: EleccionDelPaso
  // El nombre del panel de la vista previa (`?panel=vista-previa`); nulo sin ella.
  vistaPrevia: string | null
}): PasoDeLaHoja[] {
  return [
    paso('hoja', 'Hoja', null, falta ? 'falta_un_dato' : null),
    ...(vehiculo === null
      ? []
      : [paso('vehiculo', 'Vehículo', vehiculo.panel, puntoDeLaEleccion(vehiculo))]),
    ...(cliente === null
      ? []
      : [paso('cliente', 'Cliente', cliente.panel, puntoDeLaEleccion(cliente))]),
    ...(vistaPrevia === null ? [] : [paso('vista_previa', 'Vista previa', vistaPrevia, null)]),
  ]
}
