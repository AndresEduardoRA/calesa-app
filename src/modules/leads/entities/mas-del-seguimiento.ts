// Lo que ofrece el «+» del bloque «Seguimiento» de la ficha del lead: anotar un seguimiento y agendar un recordatorio, cada uno por su
// permiso (los dos piden el lead en la cartera y `leads.editar`; lo dice la base). Sin tipos de seguimiento activos, «Anotar seguimiento» va
// apagado con su motivo. Sin nada que ofrecer, `[]`: no hay «+».
import { MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO } from './edicion-de-seguimiento'

export type LineaDelMas =
  | { tipo: 'accion'; clave: 'anotar' | 'agendar'; etiqueta: string; apagada: boolean }
  | { tipo: 'nota'; clave: 'sin-tipos'; texto: string }

export const NOMBRE_DEL_MAS = 'Anotar o agendar'

export function lineasDelMas({
  puedoAnotar,
  puedoAgendar,
  hayTipos,
}: {
  puedoAnotar: boolean
  puedoAgendar: boolean
  hayTipos: boolean
}): LineaDelMas[] {
  const lineas: LineaDelMas[] = []
  if (puedoAnotar) {
    lineas.push({
      tipo: 'accion',
      clave: 'anotar',
      etiqueta: 'Anotar seguimiento',
      apagada: !hayTipos,
    })
    if (!hayTipos) {
      lineas.push({ tipo: 'nota', clave: 'sin-tipos', texto: MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO })
    }
  }
  if (puedoAgendar) {
    lineas.push({
      tipo: 'accion',
      clave: 'agendar',
      etiqueta: 'Agendar recordatorio',
      apagada: false,
    })
  }
  return lineas
}
