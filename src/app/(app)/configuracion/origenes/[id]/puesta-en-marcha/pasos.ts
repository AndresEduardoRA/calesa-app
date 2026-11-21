import {
  MOTIVO_SIN_GESTIONAR_EL_ORIGEN,
  estadoDelPaso,
  type EstadoDeLaPuestaEnMarcha,
  type PasoDeLaPuestaEnMarcha,
} from '@/modules/origenes'
import type { PasoDelPasoAPaso } from '@/modules/origenes/pantallas/puesta-en-marcha'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR, MOTIVO_SIN_CONFIGURAR_EL_FLUJO } from '../../pestanas'

// El motivo de cada paso cuando la persona no tiene su permiso en este origen (el permiso lo mira `estadoDeLaPuestaEnMarcha()`).
export const MOTIVO_DEL_PASO: Record<PasoDeLaPuestaEnMarcha, string> = {
  datos: MOTIVO_SIN_GESTIONAR_EL_ORIGEN,
  campos: MOTIVO_SIN_GESTIONAR_EL_ORIGEN,
  flujo: MOTIVO_SIN_CONFIGURAR_EL_FLUJO,
  formula: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  tarjeta: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  publicar: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
}

// Lo que dibuja `PasoAPaso`: cada paso con su ruta y, sin el permiso, su motivo (y sin enlace).
export function conMotivos(estado: EstadoDeLaPuestaEnMarcha, origenId: string): PasoDelPasoAPaso[] {
  return estado.map((paso) => ({
    clave: paso.clave,
    titulo: paso.titulo,
    estado: estadoDelPaso(paso),
    ruta: rutaDeLaPuestaEnMarcha(origenId, paso.clave),
    motivo: paso.conPermiso ? null : MOTIVO_DEL_PASO[paso.clave],
  }))
}
