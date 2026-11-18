import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import { leerEmbudos, leerOportunidadesDelLead } from '../../composicion'
import type { Embudo } from '../../entities/embudo'
import type { OportunidadDelLead } from '../../entities/oportunidad'
import type { AbiertaEnEmbudo } from '../../entities/oportunidad-unica'

export type DatosDeOportunidades = {
  puedoCrear: boolean
  // Tiene más de las que se muestran.
  hayMas: boolean
  oportunidades: OportunidadDelLead[]
  // Dónde el lead ya tiene una abierta (una por lead y embudo): el panel de crear apaga esos embudos.
  abiertasPorEmbudo: AbiertaEnEmbudo[]
  // Los de quien mira, con sus etapas: «Mover a…» ofrece las del embudo de cada una.
  embudos: Embudo[]
}

// La sección «Oportunidades» de la ficha: las de quien mira sobre ese lead y sus embudos, en paralelo.
export async function leerOportunidadesDeLead(
  leadId: string,
): Promise<Resultado<DatosDeOportunidades>> {
  const [oportunidades, embudos] = await Promise.all([
    leerOportunidadesDelLead(leadId),
    leerEmbudos(),
  ])
  if (!oportunidades.ok) {
    return oportunidades
  }
  if (!embudos.ok) {
    return embudos
  }
  return ok({ ...oportunidades.data, embudos: embudos.data })
}
