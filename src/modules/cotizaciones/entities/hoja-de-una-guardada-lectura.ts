import { z } from 'zod'
import { disenoDe } from './hoja'
import { esquemaDeDiseno } from './hoja-esquema'
import type { HermanaDeLaGuardada, HojaDeUnaGuardada } from './hoja-de-una-guardada'

// La respuesta de `cotizacion_hoja_guardada()` (4.15-2) leída con Zod, en la forma de `hoja-de-una-guardada.ts`. Sólo la importa el servidor (la lectura): el navegador recibe la
// hoja ya leída y no necesita los esquemas. Trae además la cadena (`anterior`, `encima`, `puede_cotizar_encima`) y la publicada de hoy (4.15-3b): una respuesta sin ellas no es lo que la base promete.

const esquemaDeLaCotizacion = z.object({
  id: z.guid(),
  numero: z.int(),
  clase: z.enum(['preventa', 'final']),
  version: z.int().positive(),
  origen_id: z.guid(),
  lead_id: z.guid().nullable(),
  vehiculo_id: z.guid().nullable(),
  modo_tc: z.string().nullable(),
  ver_total_bs: z.boolean(),
  titulo: z.string().nullable(),
  titulo_manual: z.boolean(),
  notas: z.string().nullable(),
  // La base ya los validó al escribirlos; sin la columna (una base sin la migración), sin retoques.
  tarjeta_retoques: z
    .object({
      celdas: z.record(z.string(), z.string()).optional(),
      filas_ocultas: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  creado_en: z.string().min(1),
  actualizado_en: z.string().min(1),
  hermana_id: z.guid().nullable().optional(),
})

const esquemaDeUnaVersion = z.object({ id: z.guid(), numero: z.int(), version: z.int().positive() })

const esquemaDeUnaGuardada = esquemaDeDiseno.extend({
  estado: z.literal('lista'),
  cotizacion: esquemaDeLaCotizacion,
  valores: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  fuentes: z.record(z.string(), z.string()),
  totales: z
    .object({ usd: z.number().nullable().optional(), bs: z.number().nullable().optional() })
    .optional(),
  puede_guardar: z.boolean(),
  vence_el: z.string().min(1),
  vencida: z.boolean(),
  publicada: z.object({ id: z.guid(), version: z.int().positive() }).nullable(),
  anterior: esquemaDeUnaVersion.nullable(),
  encima: z.union([esquemaDeUnaVersion, z.object({ oculta: z.literal(true) })]).nullable(),
  puede_cotizar_encima: z.boolean(),
  puede_cotizar_encima_en_par: z.boolean().optional(),
  hermana: z
    .union([
      z.object({
        id: z.guid(),
        disponible: z.literal(true),
        actualizado_en: z.string().min(1),
        puede_guardar: z.boolean(),
      }),
      z.object({ id: z.guid(), disponible: z.literal(false) }),
    ])
    .nullable()
    .optional(),
})

const hermanaDe = (
  h: z.infer<typeof esquemaDeUnaGuardada>['hermana'],
): HermanaDeLaGuardada | null => {
  if (!h) return null
  return h.disponible
    ? { id: h.id, disponible: true, actualizadoEn: h.actualizado_en, puedeGuardar: h.puede_guardar }
    : { id: h.id, disponible: false }
}

// La respuesta de la base ya en la forma que usa la página, o nulo si no es lo que la base promete.
export function hojaDeUnaGuardadaDesde(crudo: unknown): HojaDeUnaGuardada | null {
  const leida = esquemaDeUnaGuardada.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const h = leida.data
  const c = h.cotizacion
  return {
    diseno: disenoDe(h),
    cotizacion: {
      id: c.id,
      numero: c.numero,
      clase: c.clase,
      version: c.version,
      origenId: c.origen_id,
      leadId: c.lead_id,
      vehiculoId: c.vehiculo_id,
      modoTc: c.modo_tc,
      verTotalBs: c.ver_total_bs,
      titulo: c.titulo,
      tituloManual: c.titulo_manual,
      notas: c.notas,
      tarjetaRetoques: c.tarjeta_retoques ?? null,
      creadoEn: c.creado_en,
      actualizadoEn: c.actualizado_en,
      ...(c.hermana_id ? { hermanaId: c.hermana_id } : {}),
    },
    guardado: {
      valores: new Map(Object.entries(h.valores)),
      fuentes: new Map(Object.entries(h.fuentes)),
      totalUsd: h.totales?.usd ?? null,
      totalBs: h.totales?.bs ?? null,
    },
    puedeGuardar: h.puede_guardar,
    venceEl: h.vence_el,
    vencida: h.vencida,
    publicada: h.publicada,
    cadena: {
      anterior: h.anterior,
      encima: h.encima,
      puedeCotizarEncima: h.puede_cotizar_encima,
      ...(h.puede_cotizar_encima_en_par ? { puedeCotizarEncimaEnPar: true } : {}),
    },
    ...(h.par ? { hermana: hermanaDe(h.hermana), opcionDelPar: h.par.opcion ?? null } : {}),
  }
}
