// Lo que dibuja el bloque «Oportunidades» de la ficha del lead: sólo las abiertas (una por embudo), hasta `OPORTUNIDADES_A_LA_VISTA`, y
// «Ver todas» —el embudo filtrado por este lead— si hay algo que no se ve (más abiertas, alguna cerrada entre lo leído o más por leer). La
// lectura del servidor no cambia (`OPORTUNIDADES_VISIBLES_DEL_LEAD`, abiertas primero): cubre todas las abiertas posibles (`MAXIMO_DE_EMBUDOS`),
// así que una que se cierra al moverla sale de la vista y entra la siguiente abierta ya leída.
import type { Embudo } from './embudo'
import { rutaDelEmbudoDelLead } from './embudo-del-lead'
import type { EstadoDeOportunidad } from './oportunidad'

export const OPORTUNIDADES_A_LA_VISTA = 3

type Pedido<O> = {
  // Lo leído, en el orden de la base (abiertas primero).
  lista: readonly O[]
  // Hay más que no se leyeron.
  hayMas: boolean
  embudos: readonly Pick<Embudo, 'id' | 'esDefault'>[]
  leadId: string
}

export function oportunidadesDelBloque<
  O extends { estado: EstadoDeOportunidad; embudoId: string },
>({
  lista,
  hayMas,
  embudos,
  leadId,
}: Pedido<O>): { aLaVista: readonly O[]; verTodas: string | null } {
  const abiertas = lista.filter((o) => o.estado === 'abierta')
  const aLaVista = abiertas.slice(0, OPORTUNIDADES_A_LA_VISTA)
  const algoNoSeVe = hayMas || abiertas.length > aLaVista.length || abiertas.length < lista.length
  if (!algoNoSeVe) {
    return { aLaVista, verTodas: null }
  }
  // El embudo de la primera que se ve; sin abiertas, el por defecto de quien mira; sin ése, la vista elige.
  const embudoId = aLaVista[0]?.embudoId ?? embudos.find((e) => e.esDefault)?.id ?? null
  return { aLaVista, verTodas: rutaDelEmbudoDelLead(embudoId, leadId) }
}
