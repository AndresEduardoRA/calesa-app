// Guardar las cotizaciones hermanas (glosario: «Cotizaciones hermanas»): lo que se pide en una hoja en par y cómo se manda a la base
// (`cotizacion_crear_en_par`, `cotizacion_guardar_en_par`, `cotizacion_encima_en_par`). Lo común va una vez; lo tipeado, una vez por opción (nunca la variante: la pone
// la base). El título va sin la opción. Las versiones esperadas son el texto de la base con sus microsegundos: nunca pasan por `Date`.
import { z } from 'zod'
import type { EntradasDelPedido } from './entradas'
import type { PedidoDeGuardado } from './pedido-de-guardado'

type DeDos<T> = [T, T]

export type PedidoDeCrearEnPar = Omit<PedidoDeGuardado, 'intento' | 'entradas'> & {
  // Los dos ids que el cliente elige para las hermanas (el intento), en el orden de las opciones.
  intentos: DeDos<string>
  entradas: DeDos<EntradasDelPedido>
}
export type ArmadoDeCrearEnPar = Omit<PedidoDeCrearEnPar, 'intentos' | 'conLaAbierta'>

export type PedidoDeGuardarEnPar = {
  // Las dos cotizaciones en el orden de las opciones, cada una con su guardado y su versión.
  ids: DeDos<string>
  intentos: DeDos<string>
  actualizadosEn: DeDos<string>
  entradas: DeDos<EntradasDelPedido>
  notas: DeDos<string | null>
  modoTc: string | null
  verTotalBs: boolean
  titulo: string | null
  tituloManual: boolean
  vehiculoId: string | null
  cambiaElVehiculo: boolean
}
export type ArmadoDeGuardarEnPar = Omit<PedidoDeGuardarEnPar, 'intentos'>

export function argumentosDeCrearEnPar(p: PedidoDeCrearEnPar) {
  return {
    p_ids: [...p.intentos],
    p_origen: p.origenId,
    p_lead: p.leadId as string,
    p_entradas: [...p.entradas],
    p_abierta: p.abierta,
    ...(p.vehiculoId === null ? {} : { p_vehiculo: p.vehiculoId }),
    ...(p.modoTc === null ? {} : { p_modo_tc: p.modoTc }),
    p_con_la_abierta: p.conLaAbierta,
    p_ver_total_bs: p.verTotalBs,
    ...(p.titulo === null ? {} : { p_titulo: p.titulo }),
    p_titulo_manual: p.tituloManual,
  }
}

export function argumentosDeGuardarEnPar(p: PedidoDeGuardarEnPar) {
  return {
    p_ids: [...p.ids],
    p_intentos: [...p.intentos],
    p_actualizados_en_esperados: [...p.actualizadosEn],
    p_entradas: [...p.entradas],
    p_modo_tc: p.modoTc as string,
    p_titulo: p.titulo as string,
    p_notas: [...p.notas] as string[],
    p_vehiculo: p.vehiculoId as string,
    p_ver_total_bs: p.verTotalBs,
    p_titulo_manual: p.tituloManual,
  }
}

// El pendiente de una hoja en par en la pestaña (4-21): el mismo pedido, con los mismos ids o intentos, al volver.
const entradas = z.object({
  inputs: z.record(z.string(), z.number()),
  banderas: z.record(z.string(), z.boolean()),
  overrides: z.record(z.string(), z.number()),
})
const dos = <T extends z.ZodType>(t: T) => z.tuple([t, t])
const esquemaDeCrear = z.object({
  intentos: dos(z.string().min(1)),
  origenId: z.string(),
  leadId: z.string().nullable(),
  vehiculoId: z.string().nullable(),
  abierta: z.string(),
  entradas: dos(entradas),
  modoTc: z.string().nullable(),
  verTotalBs: z.boolean(),
  conLaAbierta: z.boolean(),
  titulo: z.string().nullable(),
  tituloManual: z.boolean(),
})
const esquemaDeGuardar = z.object({
  ids: dos(z.string().min(1)),
  intentos: dos(z.string().min(1)),
  actualizadosEn: dos(z.string().min(1)),
  entradas: dos(entradas),
  notas: dos(z.string().nullable()),
  modoTc: z.string().nullable(),
  verTotalBs: z.boolean(),
  titulo: z.string().nullable(),
  tituloManual: z.boolean(),
  vehiculoId: z.string().nullable(),
  cambiaElVehiculo: z.boolean(),
})

function leerCon<T>(esquema: z.ZodType<T>, texto: string | null): T | null {
  if (texto === null) return null
  try {
    const leido = esquema.safeParse(JSON.parse(texto))
    return leido.success ? leido.data : null
  } catch {
    return null
  }
}

export const leerPendienteDeCrearEnPar = (texto: string | null): PedidoDeCrearEnPar | null =>
  leerCon(esquemaDeCrear, texto)
export const leerPendienteDeGuardarEnPar = (texto: string | null): PedidoDeGuardarEnPar | null =>
  leerCon(esquemaDeGuardar, texto)
export const serializarPendienteEnPar = (
  pedido: PedidoDeCrearEnPar | PedidoDeGuardarEnPar,
): string => JSON.stringify(pedido)
