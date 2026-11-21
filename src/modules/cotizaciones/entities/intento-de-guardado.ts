import { z } from 'zod'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { ResultadoDeCrear } from './guardado'
import type { PedidoDeEdicion } from './pedido-de-edicion'
import type { PedidoDeGuardado } from './pedido-de-guardado'

// El intento de un guardado (4-21): un pedido que salió y del que no se sabe si llegó queda **pendiente**, y el próximo guardado reenvía ese pedido con ese intento, no lo
// que hay en la hoja. Así la base devuelve lo guardado (`repetido`) en vez de crear otra cotización.

// Lo que vuelve de un guardado: la action siempre responde `ok(ResultadoDeCrear)` cuando corrió; `{ ok: false }` sale de `enviarAccion()`.
export type EnvioDeGuardado = Envio<ResultadoDeCrear>

export function queEnviar<P>(pendiente: P | null, nuevo: P): { pedido: P; esReenvio: boolean } {
  return pendiente === null
    ? { pedido: nuevo, esReenvio: false }
    : { pedido: pendiente, esReenvio: true }
}

// «Respuesta perdida», sin ambigüedad: se conserva el pendiente sólo si no se sabe si la transacción terminó. Sin red; un `serverError` (`no_autenticado` no corrió y reenviar
// tras ingresar es seguro; `inesperado` pudo lanzar después de la RPC); un error sin SQLSTATE o una respuesta ilegible. **Todo error con SQLSTATE lo suelta:** la transacción
// de la RPC se deshizo entera. Reenviado, `cotizacion_crear` siempre guarda (o devuelve el repetido) o contesta con un código: el pendiente no se queda pegado.
export function trasElEnvio(envio: EnvioDeGuardado): 'conservar' | 'soltar' {
  if (!envio.ok) {
    return 'sinRed' in envio || envio.error.codigo !== 'validacion' ? 'conservar' : 'soltar'
  }
  return envio.data.tipo === 'perdida' ? 'conservar' : 'soltar'
}

const esquemaDelPendiente = z.object({
  intento: z.string().min(1),
  origenId: z.string(),
  // Un pendiente de antes del despliegue siempre trae el lead; sin `sin_lead`, nulo no se manda.
  leadId: z.string().nullable(),
  vehiculoId: z.string().nullable(),
  abierta: z.string(),
  entradas: z.object({
    inputs: z.record(z.string(), z.number()),
    banderas: z.record(z.string(), z.boolean()),
    overrides: z.record(z.string(), z.number()),
    variante: z.string().optional(),
  }),
  // Un pendiente de antes del despliegue no los traía: se reenvía igual que salió.
  modoTc: z.string().nullable().default(null),
  verTotalBs: z.boolean().default(false),
  conLaAbierta: z.boolean(),
  // El título (T307): uno de antes no lo traía y se reenvía como salió (automático).
  titulo: z.string().nullable().default(null),
  tituloManual: z.boolean().default(false),
  // La marca de privada: uno de antes no la traía y se reenvía pública, como salió.
  privada: z.boolean().optional(),
})

export const serializarPendiente = (pedido: PedidoDeGuardado): string => JSON.stringify(pedido)

// Lo que había en la pestaña; uno ilegible (otra versión de la pantalla, editado a mano) se ignora.
export function leerPendiente(texto: string | null): PedidoDeGuardado | null {
  if (texto === null) {
    return null
  }
  try {
    const leido = esquemaDelPendiente.safeParse(JSON.parse(texto))
    return leido.success ? leido.data : null
  } catch {
    return null
  }
}

// El pendiente de una edición (4.15-3, C9): la misma idea para `cotizacion_guardar`, con la versión que vio quien editó (el texto de la base) y los diez datos. Un pedido de la hoja
// nueva no se lee como una edición, ni al revés.
const esquemaDelPendienteDeEdicion = z.object({
  intento: z.string().min(1),
  cotizacionId: z.string(),
  actualizadoEn: z.string().min(1),
  entradas: esquemaDelPendiente.shape.entradas,
  modoTc: z.string().nullable(),
  verTotalBs: z.boolean(),
  titulo: z.string().nullable(),
  // Uno de antes del título manual (T307) no lo traía: la base leía el título como manual si traía texto.
  tituloManual: z.boolean().optional(),
  notas: z.string().nullable(),
  vehiculoId: z.string().nullable(),
  // Uno de antes del cambio de vehículo (T315) no lo traía: entonces la hoja no cambiaba el vehículo.
  cambiaElVehiculo: z.boolean().optional(),
})

export const serializarPendienteDeEdicion = (pedido: PedidoDeEdicion): string =>
  JSON.stringify(pedido)

export function leerPendienteDeEdicion(texto: string | null): PedidoDeEdicion | null {
  if (texto === null) {
    return null
  }
  try {
    const leido = esquemaDelPendienteDeEdicion.safeParse(JSON.parse(texto))
    if (!leido.success) {
      return null
    }
    const { tituloManual, cambiaElVehiculo, ...resto } = leido.data
    return {
      ...resto,
      tituloManual: tituloManual ?? resto.titulo !== null,
      cambiaElVehiculo: cambiaElVehiculo ?? false,
    }
  } catch {
    return null
  }
}
