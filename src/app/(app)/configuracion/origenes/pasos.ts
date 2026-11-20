import type { ClaveDePaso, PasoParaCotizar } from '@/modules/origenes'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import {
  RUTAS,
  rutaDeConfiguracionDeCotizacion,
  rutaDeParteDelOrigen,
  type ParteDelOrigen,
} from '@/shared/lib/rutas'
import { MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR, MOTIVO_SIN_CONFIGURAR_EL_FLUJO } from './pestanas'

// A dónde lleva cada paso de «Para cotizar y mover»: a la pestaña del origen donde se arregla, con el permiso que pide en ese origen.
// La Tarjeta, a la sub-pestaña de Fórmula. Datos con aviso (un origen de subasta sin apibara) lleva a Empresa › Integraciones, que es
// donde se activa: la pestaña Datos no la enciende.
export type PasoConDestino = PasoParaCotizar & {
  ruta: string
  // Sin el permiso, el paso se dice sin enlace y con este motivo.
  motivo: string | null
}

type Destino = { ruta: (origenId: string) => string; permiso: ClavePermiso | null; motivo: string }

const A_LA_PESTANA = (parte: ParteDelOrigen) => (origenId: string) =>
  rutaDeParteDelOrigen(origenId, parte)

export const DESTINOS_DE_PASO: Record<ClaveDePaso, Destino> = {
  datos: { ruta: A_LA_PESTANA('datos'), permiso: null, motivo: '' },
  campos: { ruta: A_LA_PESTANA('campos'), permiso: null, motivo: '' },
  flujo: {
    ruta: A_LA_PESTANA('flujo'),
    permiso: 'flujos.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_FLUJO,
  },
  formula: {
    ruta: A_LA_PESTANA('formula'),
    permiso: 'cotizaciones.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
  tarjeta: {
    ruta: (origenId) => rutaDeConfiguracionDeCotizacion(origenId, 'tarjeta'),
    permiso: 'cotizaciones.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
}

const APIBARA: Destino = {
  ruta: () => RUTAS.integracionesDeEmpresa,
  permiso: 'empresa.ajustes.gestionar',
  motivo: 'La activa quien tiene el permiso «Ajustes de la empresa».',
}

export function destinoDelPaso(paso: PasoParaCotizar): Destino {
  return paso.clave === 'datos' && paso.estado !== 'listo' ? APIBARA : DESTINOS_DE_PASO[paso.clave]
}

// Los pasos con su enlace, mirando el permiso en este origen (el de apibara es de la empresa).
export function conDestino(
  pasos: readonly PasoParaCotizar[],
  permisos: Permisos,
  origenId: string,
): PasoConDestino[] {
  return pasos.map((paso) => {
    const destino = destinoDelPaso(paso)
    const enEsteOrigen = destino === APIBARA ? null : origenId
    const abre = destino.permiso === null || puede(permisos, destino.permiso, enEsteOrigen)
    return { ...paso, ruta: destino.ruta(origenId), motivo: abre ? null : destino.motivo }
  })
}
