// Los pasos comunes del reductor del editor de la tarjeta: anunciar, rechazar con su motivo, registrar un paso en el historial (salvo que nada cambie), operar sobre
// lo elegido, elegir y deshacer o rehacer. Puro.
import { cortar, deshacer, registrar, rehacer } from './historial'
import { mapaDeLaGrilla, type MapaDeLaGrilla } from './mapa-de-la-grilla'
import { anuncioDeLaSeleccion } from './ruta-de-la-seleccion'
import { ajustarSeleccion, rangoDe, type Seleccion } from './seleccion'
import { MOTIVO_SIN_SELECCION, type EstadoDelEditor, type Instantanea } from './estado-del-editor'
import type { Rect, ResultadoDeEdicion } from './tipos'

export const decir = (e: EstadoDelEditor, texto: string): EstadoDelEditor['anuncio'] => ({
  texto,
  vez: e.anuncio.vez + 1,
})

export const rechazar = (e: EstadoDelEditor, motivo: string): EstadoDelEditor => ({
  ...e,
  rechazo: motivo,
  anuncio: decir(e, motivo),
})

// Un paso hecho (o el rechazo): registra lo de antes en el historial, salvo que la plantilla no haya cambiado.
export function conResultado(
  e: EstadoDelEditor,
  nombre: string,
  resultado: ResultadoDeEdicion,
  clave?: string,
): EstadoDelEditor {
  if (!resultado.ok) return rechazar(e, resultado.motivo)
  if (resultado.plantilla === e.plantilla)
    return { ...e, rechazo: null, anuncio: decir(e, resultado.anuncio) }
  const antes: Instantanea = { plantilla: e.plantilla, seleccion: e.seleccion }
  return {
    ...e,
    plantilla: resultado.plantilla,
    seleccion: ajustarSeleccion(
      resultado.seleccion ?? e.seleccion,
      mapaDeLaGrilla(resultado.plantilla),
    ),
    historial: registrar(e.historial, antes, nombre, clave === undefined ? {} : { clave }),
    escribiendo: null,
    rechazo: null,
    anuncio: decir(e, resultado.anuncio),
  }
}

// Una operación sobre lo elegido.
export function sobreLoElegido(
  e: EstadoDelEditor,
  nombre: string,
  hacer: (r: Rect, mapa: MapaDeLaGrilla) => ResultadoDeEdicion,
  clave?: string,
): EstadoDelEditor {
  if (e.seleccion === null) return rechazar(e, MOTIVO_SIN_SELECCION)
  const mapa = mapaDeLaGrilla(e.plantilla)
  return conResultado(e, nombre, hacer(rangoDe(e.seleccion, mapa, e.plantilla), mapa), clave)
}

export function elegir(e: EstadoDelEditor, seleccion: Seleccion | null): EstadoDelEditor {
  const mapa = mapaDeLaGrilla(e.plantilla)
  return {
    ...e,
    seleccion,
    historial: cortar(e.historial),
    escribiendo: null,
    rechazo: null,
    anuncio: decir(e, anuncioDeLaSeleccion(seleccion, mapa, e.plantilla)),
  }
}

export function volver(e: EstadoDelEditor, hacia: 'atras' | 'adelante'): EstadoDelEditor {
  const actual: Instantanea = { plantilla: e.plantilla, seleccion: e.seleccion }
  const vuelta = hacia === 'atras' ? deshacer(e.historial, actual) : rehacer(e.historial, actual)
  if (vuelta === null)
    return rechazar(e, hacia === 'atras' ? 'No hay nada que deshacer.' : 'No hay nada que rehacer.')
  return {
    ...e,
    plantilla: vuelta.estado.plantilla,
    seleccion: ajustarSeleccion(vuelta.estado.seleccion, mapaDeLaGrilla(vuelta.estado.plantilla)),
    historial: vuelta.historial,
    escribiendo: null,
    rechazo: null,
    anuncio: decir(e, `${hacia === 'atras' ? 'Deshiciste' : 'Rehiciste'}: ${vuelta.nombre}.`),
  }
}
