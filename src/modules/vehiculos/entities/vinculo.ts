// El vínculo de un vehículo (el lead dueño o comprador, uno a la vez, con historial). Acá sólo se lee: se escribe por RPC (`vehiculo_vincular`). El nombre de un
// lead sólo llega si quien mira lo ve; si no, es nulo. Los interesados y todo lo demás que lo relaciona con leads: `relacionados.ts`.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { numerosDesde, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'

// Lo que se lee de un vehículo (cierre 1): las RPC traen uno de más para saber si hay otros y decirlo.
export const TOPE_DE_VINCULOS = 50

export type Vinculo = {
  leadId: string
  // null = un lead que quien mira no ve (no está en su cartera, o ya no existe).
  leadNombre: string | null
  // Los números del lead que quien mira ve (el global sólo con el permiso; el propio, el suyo).
  leadNumeros: NumerosDeLead
  desde: string
  // null = el vigente.
  hasta: string | null
  // Quién lo vinculó; null si fue un proceso (una cotización marcada como final).
  porNombre: string | null
}

export type VinculosDelVehiculo = {
  // El vínculo activo; null = el vehículo no es de ningún lead.
  vinculo: Vinculo | null
  // Los anteriores, del más reciente al más viejo; `historialHayMas`: había más que el tope (`TOPE_DE_VINCULOS`, el vigente
  // incluido) y no se ven.
  historial: Vinculo[]
  historialHayMas: boolean
}

const filasDeVinculo = z.array(
  z.object({
    lead_id: z.guid(),
    lead_nombre: z.string().nullable(),
    lead_numero: z.number().nullable(),
    lead_numero_propio: z.number().nullable(),
    desde: z.string(),
    hasta: z.string().nullable(),
    por_nombre: z.string().nullable(),
  }),
)

// Lo que devuelve `vehiculo_vinculos()`.
export function vinculosDesde(vinculos: unknown): VinculosDelVehiculo {
  const leidos = cortarAlTope(filasDeVinculo.parse(vinculos), TOPE_DE_VINCULOS)
  const todos = leidos.filas.map((fila) => ({
    leadId: fila.lead_id,
    leadNombre: fila.lead_nombre,
    leadNumeros: numerosDesde({ numero: fila.lead_numero, numero_propio: fila.lead_numero_propio }),
    desde: fila.desde,
    hasta: fila.hasta,
    porNombre: fila.por_nombre,
  }))
  return {
    vinculo: todos.find((uno) => uno.hasta === null) ?? null,
    historial: todos.filter((uno) => uno.hasta !== null),
    historialHayMas: leidos.hayMas,
  }
}

export const LEAD_QUE_NO_VES = 'Un lead que no está en tu cartera'

// Cómo se nombra al lead de un vínculo: por su nombre si quien mira lo ve.
export function nombreDeLead(vinculo: Pick<Vinculo, 'leadNombre'>): string {
  return vinculo.leadNombre ?? LEAD_QUE_NO_VES
}

// El lead vigente de un vehículo, para proponerlo como cliente donde se lo nombra (el formulario «Nuevo proyecto» de repuestos): sólo si quien mira lo ve
// (el nombre llega). Uno que no se ve, en la papelera o en el limbo, no se propone, y eso no se distingue de un vehículo sin lead.
export type LeadVinculado = { id: string; nombre: string; numeros: NumerosDeLead }

export function leadVinculadoDe(vinculos: VinculosDelVehiculo): LeadVinculado | null {
  const vigente = vinculos.vinculo
  if (vigente === null || vigente.leadNombre === null) {
    return null
  }
  return { id: vigente.leadId, nombre: vigente.leadNombre, numeros: vigente.leadNumeros }
}
