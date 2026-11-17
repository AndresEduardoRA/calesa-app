// Un lead para enlazarlo desde la pantalla de otro módulo (la cabecera de un proyecto de repuestos, el lead que deja el alta en su formulario): su nombre,
// sus números como siempre y si está en la cartera de quien mira. Nunca el teléfono. Puro: lo arma `infra/queries/lead-para-enlazar.ts`.
import { z } from 'zod'
import type { Resultado } from '@/shared/lib/errores'
import { CAMPOS_DE_NUMEROS, numerosDesde, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'

export type LeadParaEnlazar = {
  id: string
  nombre: string
  numeros: NumerosDeLead
  // Falso = quien mira lo ve por su alcance, pero no es de su cartera: se dice «Fuera de tu cartera».
  enCartera: boolean
}

// Lo que se pide de `leads_vista`: sin ninguna columna de teléfono.
export const COLUMNAS_DEL_LEAD_PARA_ENLAZAR =
  'id, nombre, numero, numero_propio, numero_propio_creador, en_cartera'

const esquema = z.object({
  id: z.guid(),
  nombre: z.string(),
  en_cartera: z.boolean(),
  ...CAMPOS_DE_NUMEROS,
})

/** La fila de `leads_vista`; nula si no tiene la forma esperada. */
export function leadParaEnlazarDesde(fila: unknown): LeadParaEnlazar | null {
  const leida = esquema.safeParse(fila)
  return leida.success
    ? {
        id: leida.data.id,
        nombre: leida.data.nombre,
        numeros: numerosDesde(leida.data),
        enCartera: leida.data.en_cartera,
      }
    : null
}

// Lee un lead por id con la sesión de quien mira. `ok(null)`: la lectura respondió sin fila (no existe, está en la papelera, en el limbo o no se ve: no se
// distinguen); un error de la lectura es un error, nunca «no se ve».
export type LectorDeLeadParaEnlazar = (id: string) => Promise<Resultado<LeadParaEnlazar | null>>
