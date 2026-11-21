// «Empezar con las fases de…»: copiar las fases de otro origen al flujo de un origen que todavía no tiene ninguna (`flujo_copiar_fases`). Puro: la
// URL del modal, la respuesta de la base leída con Zod, la frase de cada cosa que no se copió y la de cada rechazo.
import { z } from 'zod'

// `?panel=copiar-fases`: el modal de la copia. Lo monta la barra del flujo (persiste al releer la página tras copiar).
export const PANEL_COPIAR_FASES = 'copiar-fases'

export const MOTIVO_YA_TIENE_FASES = 'Este flujo ya tiene fases.'
export const MOTIVO_SIN_DE_DONDE_COPIAR = 'No hay otro origen con fases para copiar.'

// El modal sólo abre en un flujo sin ninguna fase (tampoco jubiladas: la base exige el flujo vacío) y con algún origen de donde copiar; nulo si abre.
export function motivoParaNoAbrirCopiarFases(
  flujo: { fases: readonly unknown[] },
  cuantosDesde: number,
): string | null {
  if (flujo.fases.length > 0) {
    return MOTIVO_YA_TIENE_FASES
  }
  return cuantosDesde === 0 ? MOTIVO_SIN_DE_DONDE_COPIAR : null
}

export const MOTIVOS_DE_LO_SALTADO = [
  'subasta',
  'espera_apagada',
  'espera_otro_flujo',
  'espera_jubilada',
  'tipo_documento_reusado',
] as const
export type MotivoDeLoSaltado = (typeof MOTIVOS_DE_LO_SALTADO)[number]

// Algo que no se copió tal cual: una fase (su marca de subasta o su espera) o un tipo de documento que ya existía con ese nombre.
export type Saltado = { motivo: MotivoDeLoSaltado; nombre: string }

export type RespuestaDeCopiarFases = {
  // La versión nueva del flujo, texto ISO tal cual.
  version: string
  copiado: { fases: number; salidas: number; requisitos: number; tiposDocumento: number }
  // Hasta 50; `saltadoHayMas` dice si la base cortó.
  saltado: Saltado[]
  saltadoHayMas: boolean
}

const cuenta = z.number().int().min(0)
const respuestaCruda = z.object({
  version: z.string().min(1),
  copiado: z.object({
    fases: cuenta,
    salidas: cuenta,
    requisitos: cuenta,
    tipos_documento: cuenta,
  }),
  saltado: z.array(z.object({ motivo: z.enum(MOTIVOS_DE_LO_SALTADO), nombre: z.string() })),
  saltado_hay_mas: z.boolean(),
})

// Una respuesta que no se entiende es `null` (el repositorio la dice como error), nunca un dato a medias.
export function respuestaDeCopiarFasesDesde(crudo: unknown): RespuestaDeCopiarFases | null {
  const r = respuestaCruda.safeParse(crudo)
  if (!r.success) {
    return null
  }
  const { version, copiado, saltado, saltado_hay_mas } = r.data
  return {
    version,
    copiado: {
      fases: copiado.fases,
      salidas: copiado.salidas,
      requisitos: copiado.requisitos,
      tiposDocumento: copiado.tipos_documento,
    },
    saltado,
    saltadoHayMas: saltado_hay_mas,
  }
}

// La línea que dice qué no se copió, nombrando la fase o el tipo de documento.
export function textoDeLoSaltado({ motivo, nombre }: Saltado): string {
  switch (motivo) {
    case 'subasta':
      return `Fase «${nombre}»: era la subasta; este origen no es de subasta.`
    case 'espera_apagada':
      return `Fase «${nombre}»: su espera no se copió porque las esperas estaban apagadas.`
    case 'espera_jubilada':
      return `Fase «${nombre}»: esperaba a una fase de repuestos jubilada.`
    case 'espera_otro_flujo':
      return `Fase «${nombre}»: su espera es de otro flujo.`
    case 'tipo_documento_reusado':
      return `Tipo de documento «${nombre}»: ya había uno con ese nombre y se usa ese.`
  }
}

// La frase de cada rechazo de `flujo_copiar_fases`, por código y `hint`; nulo si no es uno conocido (vale el mensaje genérico). El `PT409` no pasa por
// acá: conserva el texto de la base.
export function motivoDelRechazoDeCopiar(
  codigo: string | null | undefined,
  hint: string | null | undefined,
): string | null {
  if (codigo === '23514' && hint === 'destino') {
    return 'Este flujo ya tiene fases: recarga para verlas.'
  }
  if (codigo === '22023') {
    if (hint === 'desde')
      return 'Ya no se puede copiar de ese origen: recarga para ver de cuáles sí.'
    if (hint === 'tipos_documento') return 'No caben más tipos de documento en este flujo.'
    if (hint === 'destino') return 'Sólo se copian fases entre flujos de vehículos.'
  }
  if (codigo === '42501') {
    return hint === 'desde'
      ? 'No puedes configurar el flujo de ese origen.'
      : 'No tienes permiso para configurar las fases de este flujo.'
  }
  return null
}
