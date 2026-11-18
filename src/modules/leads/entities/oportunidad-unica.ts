// Una oportunidad abierta por embudo: un lead tiene como mucho una abierta y viva en cada embudo de quien mira (la guarda de la base,
// `_oportunidad_abierta_unica`). La interfaz lo dice antes de enviar —«Crear igual» apagado, los embudos ocupados apagados— con lo que trae
// la primera página de `lead_oportunidades` (`abiertas_por_embudo`), y si la base rechaza igual (otra pestaña la creó en el medio), el
// rechazo trae el id de la abierta para ofrecer «Abrir esa».
import { z } from 'zod'
import { resolverAcciones, type AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import type { Embudo } from './embudo'
import type { OportunidadDelLead } from './oportunidad'
import { rutaDeLasOportunidadesDe } from './oportunidad-rapida'

// La causa del rechazo de la guarda (`ErrorApp.causa`): 22023 con `hint` `embudo_id` y el id de la abierta en `detail`.
export const CAUSA_OPORTUNIDAD_ABIERTA = 'oportunidad_abierta'

export const MOTIVO_SIN_EMBUDO_LIBRE = 'Ya tiene una oportunidad abierta en cada embudo.'

// Lo que dice una opción apagada del campo «Embudo» (el nombre ya está al lado).
export const YA_TIENE_UNA_ABIERTA = 'Ya tiene una abierta'

// Un embudo de quien mira donde el lead ya tiene una abierta, y cuál (la más reciente, si quedaron duplicadas de antes).
export type AbiertaEnEmbudo = {
  embudoId: string
  embudoNombre: string
  esDefault: boolean
  oportunidadId: string
}

const esquemaAbierta = z.object({
  embudo_id: z.guid(),
  embudo_nombre: z.string().min(1),
  es_default: z.boolean(),
  oportunidad_id: z.guid(),
})

// `abiertas_por_embudo` de la primera página de `lead_oportunidades`. Sin la clave (una página con cursor) o rota: ninguna; lo roto se descarta.
export function abiertasPorEmbudoDesde(crudo: unknown): AbiertaEnEmbudo[] {
  const leido = z.object({ abiertas_por_embudo: z.array(z.unknown()) }).safeParse(crudo)
  if (!leido.success) {
    return []
  }
  return leido.data.abiertas_por_embudo.flatMap((una) => {
    const fila = esquemaAbierta.safeParse(una)
    return fila.success
      ? [
          {
            embudoId: fila.data.embudo_id,
            embudoNombre: fila.data.embudo_nombre,
            esDefault: fila.data.es_default,
            oportunidadId: fila.data.oportunidad_id,
          },
        ]
      : []
  })
}

export function abiertaEnElPorDefecto(
  abiertas: readonly AbiertaEnEmbudo[],
): AbiertaEnEmbudo | null {
  return abiertas.find((a) => a.esDefault) ?? null
}

// Dónde hay una abierta según lo que la sección de la ficha tiene cargado (lo que se crea, se mueve, se elimina o se restaura ya está ahí): las
// abiertas van primero, así que si lo cargado llega a una cerrada o no hay más, están todas y mandan; si no (más abiertas que las cargadas, sólo
// con duplicadas de antes), se suman a las de la primera lectura del servidor (`abiertas_por_embudo`). Una por embudo: la más reciente.
export function abiertasDeLoCargado(
  delServidor: readonly AbiertaEnEmbudo[],
  cargadas: readonly OportunidadDelLead[],
  hayMas: boolean,
  embudos: readonly Embudo[],
): AbiertaEnEmbudo[] {
  const estanTodas = !hayMas || cargadas.some((o) => o.estado !== 'abierta')
  const porEmbudo = new Map<string, AbiertaEnEmbudo>()
  for (const o of cargadas) {
    if (o.estado === 'abierta' && !o.eliminada && !porEmbudo.has(o.embudoId)) {
      porEmbudo.set(o.embudoId, {
        embudoId: o.embudoId,
        embudoNombre: o.embudo.nombre,
        esDefault: embudos.find((e) => e.id === o.embudoId)?.esDefault ?? false,
        oportunidadId: o.id,
      })
    }
  }
  if (!estanTodas) {
    for (const a of delServidor) {
      if (!porEmbudo.has(a.embudoId)) {
        porEmbudo.set(a.embudoId, a)
      }
    }
  }
  return [...porEmbudo.values()]
}

export type OpcionDeEmbudo = { valor: string; etiqueta: string; deshabilitada: boolean }

// El campo «Embudo» del panel de crear: el de por defecto (valor `''`: la base lo elige) y los demás; los que ya tienen una abierta van
// apagados con el motivo. `inicial`: el de por defecto si está libre, si no el primero libre; `null` si no queda ninguno (crear se apaga).
// Sin embudos todavía, `''`: el de por defecto lo crea la base con la primera.
export function embudosParaCrear(
  embudos: readonly Embudo[],
  abiertas: readonly AbiertaEnEmbudo[],
): { opciones: OpcionDeEmbudo[]; inicial: string | null } {
  const ocupado = new Set(abiertas.map((a) => a.embudoId))
  const opcion = (valor: string, nombre: string, id: string | null): OpcionDeEmbudo => {
    const deshabilitada = id !== null && ocupado.has(id)
    return {
      valor,
      etiqueta: deshabilitada ? `${nombre} · ${YA_TIENE_UNA_ABIERTA}` : nombre,
      deshabilitada,
    }
  }
  const porDefecto = embudos.find((e) => e.esDefault)
  const opciones = [
    opcion('', `${porDefecto?.nombre ?? 'El de siempre'} (por defecto)`, porDefecto?.id ?? null),
    ...embudos.filter((e) => !e.esDefault).map((e) => opcion(e.id, e.nombre, e.id)),
  ]
  const libre = opciones.find((o) => !o.deshabilitada)
  return { opciones, inicial: libre ? libre.valor : null }
}

// El id de la abierta que trajo un rechazo de la guarda (`abierta` en el envío de la action), o `null` si el rechazo es otro.
export function abiertaDelRechazo(envio: unknown): string | null {
  if (typeof envio !== 'object' || envio === null || !('abierta' in envio)) {
    return null
  }
  const leido = z.guid().safeParse(envio.abierta)
  return leido.success ? leido.data : null
}

// «Abrir esa»: el panel de la abierta en la ficha del lead (`?panel=editar-oportunidad&oportunidad=<id>`).
export function accionesDeLaAbierta(leadId: string, oportunidadId: string): AccionesDeUnAviso {
  return resolverAcciones([
    {
      accion: {
        tipo: 'ir',
        etiqueta: 'Abrir esa',
        ruta: rutaDeLasOportunidadesDe(leadId, oportunidadId),
      },
      puede: true,
    },
  ])
}

// Las opciones de `avisarError()` para el rechazo de una oportunidad: si es de «una abierta por lead y embudo» (reabrir con «Mover a…» o
// restaurar con «Deshacer» habiendo otra abierta), «Abrir esa»; si no, ninguna.
export function accionesDelRechazo(
  leadId: string,
  envio: unknown,
): { acciones?: AccionesDeUnAviso } {
  const abierta = abiertaDelRechazo(envio)
  return abierta ? { acciones: accionesDeLaAbierta(leadId, abierta) } : {}
}
