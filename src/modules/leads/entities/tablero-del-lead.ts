// El embudo del lead: lo que dibuja el bloque «Oportunidades» de la ficha. Una columna por etapa del embudo elegido, con las oportunidades de este
// lead en cada una (abiertas, ganadas y perdidas: lo leído de `lead_oportunidades`, abiertas primero). Una abierta por embudo y lead (la guarda de
// la base), así que la columna de una etapa abierta lleva una; las cerradas se acumulan y se dibujan hasta `OPORTUNIDADES_POR_COLUMNA`: el resto
// está en «Ver en el embudo» (el embudo filtrado por este lead). Ningún número del bloque es un total.
import type { Embudo, EtapaGuardada } from './embudo'
import { rutaDelEmbudoDelLead } from './embudo-del-lead'

// Lo que se dibuja en una columna; lo demás se dice sin número y lleva a «Ver en el embudo».
export const OPORTUNIDADES_POR_COLUMNA = 3

// El embudo que se ve: el primero de `candidatos` que quien mira todavía tiene (lo que eligió ahora, lo que recordó), si no el de por defecto, si
// no el primero. `null` sólo si no tiene embudos.
export function embudoDeLaFicha(
  embudos: readonly Embudo[],
  ...candidatos: readonly (string | null | undefined)[]
): Embudo | null {
  for (const id of candidatos) {
    const encontrado = id ? embudos.find((e) => e.id === id) : undefined
    if (encontrado) {
      return encontrado
    }
  }
  return embudos.find((e) => e.esDefault) ?? embudos[0] ?? null
}

type DeUnLead = { id: string; embudoId: string; etapaId: string; eliminada: boolean }

export type ColumnaDelLead<O> = {
  etapa: EtapaGuardada
  // Las que se dibujan, en el orden leído.
  oportunidades: readonly O[]
  // Hay más en esta etapa que las que se dibujan.
  hayMasAqui: boolean
}

export type TableroDelLead<O> = {
  embudo: Embudo
  columnas: readonly ColumnaDelLead<O>[]
  // Ninguna oportunidad de este lead en este embudo y nada más por leer: el vacío con «Nueva».
  vacio: boolean
  // «Ver en el embudo»: la vista filtrada por este lead, siempre.
  verEnElEmbudo: string
  // Algo no se dibuja (más por leer o más que el tope de una columna): «Ver en el embudo» se ofrece también al pie.
  hayMasFuera: boolean
}

export function tableroDelLead<O extends DeUnLead>({
  lista,
  hayMas,
  embudo,
  leadId,
}: {
  // Lo leído, en el orden de la base (abiertas primero).
  lista: readonly O[]
  hayMas: boolean
  embudo: Embudo
  leadId: string
}): TableroDelLead<O> {
  const delEmbudo = lista.filter((o) => o.embudoId === embudo.id && !o.eliminada)
  const columnas = embudo.etapas.map((etapa) => {
    const deLaEtapa = delEmbudo.filter((o) => o.etapaId === etapa.id)
    return {
      etapa,
      oportunidades: deLaEtapa.slice(0, OPORTUNIDADES_POR_COLUMNA),
      hayMasAqui: deLaEtapa.length > OPORTUNIDADES_POR_COLUMNA,
    }
  })
  return {
    embudo,
    columnas,
    vacio: delEmbudo.length === 0 && !hayMas,
    verEnElEmbudo: rutaDelEmbudoDelLead(embudo.id, leadId),
    hayMasFuera: hayMas || columnas.some((c) => c.hayMasAqui),
  }
}

// El vacío del bloque: sin embudo todavía (el de por defecto lo crea la base con la primera oportunidad), o sin oportunidades de este lead en el embudo elegido.
export function vacioDelTablero(nombreDelEmbudo: string | null): string {
  return nombreDelEmbudo === null
    ? 'Sin oportunidades.'
    : `Sin oportunidades en «${nombreDelEmbudo}».`
}

// A qué etapa va una oportunidad soltada sobre `sobreId` (el id de una columna): la etapa de su embudo si es otra que la suya; si no, nada (soltarla
// donde estaba, o fuera de toda columna, no mueve).
export function etapaDeDestino(
  oportunidad: { etapaId: string },
  etapas: readonly EtapaGuardada[],
  sobreId: string | null,
): EtapaGuardada | null {
  if (sobreId === null || sobreId === oportunidad.etapaId) {
    return null
  }
  return etapas.find((e) => e.id === sobreId) ?? null
}

// La columna a la que va el teclado desde la de `desde` con una flecha (+1 derecha, -1 izquierda): la vecina, o nada en el borde.
export function etapaVecina(
  etapas: readonly EtapaGuardada[],
  desde: string,
  paso: 1 | -1,
): EtapaGuardada | null {
  const i = etapas.findIndex((e) => e.id === desde)
  return i < 0 ? null : (etapas[i + paso] ?? null)
}
