// Los pendientes de la agenda (Glosario: «Pendientes (de la agenda)»): lo que está por hacer de quien mira, al costado de la hoja del día.
// Tres grupos: «Vencidas» (mis tareas pendientes con el vencimiento pasado), «Recordatorios» (los míos pendientes, vencidos o de hoy) y
// «Sin fecha» (mis tareas pendientes sin vencimiento). Puro: las respuestas de las RPC son `jsonb` sin tipo y se **parsean** (Zod en todo límite).
import { z } from 'zod'
import type { Resultado } from '@/shared/lib/errores'
import { formatearFechaHora, formatearHora } from '@/shared/lib/fechas'
import type { ClaveDeClase } from './agenda'
import { paginaDeSinFecha } from './sin-fecha'

// En el orden en que se dibujan.
export const GRUPOS_DE_PENDIENTES = ['vencidas', 'recordatorios', 'sin_fecha'] as const
export type GrupoDePendientes = (typeof GRUPOS_DE_PENDIENTES)[number]

export const TITULO_DEL_GRUPO: Record<GrupoDePendientes, string> = {
  vencidas: 'Vencidas',
  recordatorios: 'Recordatorios',
  sin_fecha: 'Sin fecha',
}

export type PendienteDeAgenda = {
  clase: 'tarea' | 'recordatorio'
  id: string
  titulo: string
  // El vencimiento o la hora del recordatorio (ISO); nulo en «Sin fecha».
  instante: string | null
  // La versión: «Completar» la manda (PT409 si otro la cambió).
  actualizadoEn: string
  // El instante del cursor, tal como vino de la base (con su precisión): el vencimiento, la hora o, en «Sin fecha», el alta.
  orden: string
}

export type PaginaDePendientes = { filas: PendienteDeAgenda[]; hayMas: boolean }

// Cada grupo pedido con su primera página; `null`, el que no se pidió («Qué ver» lo excluye).
export type PendientesDeAgenda = Record<GrupoDePendientes, PaginaDePendientes | null>

// Desde dónde sigue un grupo: la última fila leída `(orden, id)`.
export type CursorDePendientes = { en: string; id: string }

// La primera página de los grupos pedidos. `hasta`: el fin de hoy en la zona de la empresa (los recordatorios de hoy y los vencidos).
export type LectorDePendientes = (pedido: {
  hasta: string
  grupos: readonly GrupoDePendientes[]
}) => Promise<Resultado<PendientesDeAgenda>>

// La página que sigue de un grupo («Ver más», en el navegador).
export type LectorDeMasPendientes = (pedido: {
  grupo: GrupoDePendientes
  cursor: CursorDePendientes
  hasta: string
}) => Promise<Resultado<PaginaDePendientes>>

// Qué grupos pide «Qué ver»: sin tareas no hay «Vencidas» ni «Sin fecha»; sin recordatorios, no hay «Recordatorios».
export function gruposDePendientes(clases: readonly ClaveDeClase[]): GrupoDePendientes[] {
  return GRUPOS_DE_PENDIENTES.filter((grupo) =>
    clases.includes(grupo === 'recordatorios' ? 'recordatorio' : 'tarea'),
  )
}

const iso = z.iso.datetime({ offset: true })

const esquemaDeVencidas = z.object({
  filas: z.array(
    z.object({ id: z.guid(), titulo: z.string(), vence_en: iso, actualizado_en: iso }),
  ),
  hay_mas: z.boolean(),
})

const esquemaDeRecordatorios = z.object({
  filas: z.array(
    z.object({ id: z.guid(), titulo: z.string(), recordar_en: iso, actualizado_en: iso }),
  ),
  hay_mas: z.boolean(),
})

// De lo que devolvió la RPC del grupo a su página, o `null` si no tiene la forma esperada.
export function paginaDePendientes(
  grupo: GrupoDePendientes,
  datos: unknown,
): PaginaDePendientes | null {
  if (grupo === 'vencidas') {
    const leido = esquemaDeVencidas.safeParse(datos)
    return leido.success
      ? {
          filas: leido.data.filas.map((f) => ({
            clase: 'tarea',
            id: f.id,
            titulo: f.titulo,
            instante: f.vence_en,
            actualizadoEn: f.actualizado_en,
            orden: f.vence_en,
          })),
          hayMas: leido.data.hay_mas,
        }
      : null
  }
  if (grupo === 'recordatorios') {
    const leido = esquemaDeRecordatorios.safeParse(datos)
    return leido.success
      ? {
          filas: leido.data.filas.map((f) => ({
            clase: 'recordatorio',
            id: f.id,
            titulo: f.titulo,
            instante: f.recordar_en,
            actualizadoEn: f.actualizado_en,
            orden: f.recordar_en,
          })),
          hayMas: leido.data.hay_mas,
        }
      : null
  }
  const pagina = paginaDeSinFecha(datos)
  return pagina
    ? {
        filas: pagina.tareas.map((t) => ({
          clase: 'tarea',
          id: t.id,
          titulo: t.titulo,
          instante: null,
          actualizadoEn: t.actualizadoEn,
          orden: t.creadoEn,
        })),
        hayMas: pagina.hayMas,
      }
    : null
}

// El cursor de la página que sigue: la última fila de lo cargado (nulo si no hay nada cargado).
export function cursorDePendientes(filas: readonly PendienteDeAgenda[]): CursorDePendientes | null {
  const ultima = filas.at(-1)
  return ultima ? { en: ultima.orden, id: ultima.id } : null
}

// «Vencida · 15 nov 2026, 18:00», «Vencido · …» o «Hoy 15:00»: cuándo, en texto suave junto al título. «Sin fecha» no dice nada.
export function cuandoDelPendiente(
  grupo: GrupoDePendientes,
  instante: string | null,
  { ahora, zona }: { ahora: string; zona: string },
): string | null {
  if (!instante) {
    return null
  }
  if (grupo === 'vencidas') {
    return `Vencida · ${formatearFechaHora(instante, { zona })}`
  }
  return Date.parse(instante) < Date.parse(ahora)
    ? `Vencido · ${formatearFechaHora(instante, { zona })}`
    : `Hoy ${formatearHora(instante, { zona })}`
}

// Lo que dice «Mostrando…» al llegar al tope de lo cargado: «Sin fecha» va de la más nueva a la más vieja; los otros, al revés.
export function textoDelTopeDePendientes(grupo: GrupoDePendientes, tope: number): string {
  return grupo === 'sin_fecha'
    ? `Mostrando las ${String(tope)} más recientes.`
    : `Mostrando los ${String(tope)} más antiguos.`
}
