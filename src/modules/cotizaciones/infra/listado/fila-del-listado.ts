// Una fila de `cotizaciones_listado()` y `cotizaciones_buscar()` (sin el snapshot) leída con Zod: la usan la lectura del servidor (`listado.ts`,
// `listado-por-vehiculo.ts`) y la del navegador (el despliegue de un grupo, `grupo-del-listado.client.ts`). Sin I/O ni `server-only`.
import { z } from 'zod'
import type { FilaDelListado } from '../../entities/listado/listado'

export const esquemaDeFila = z.object({
  id: z.guid(),
  numero: z.number(),
  origen_id: z.guid(),
  lead_id: z.guid().nullable(),
  vehiculo_id: z.guid().nullable(),
  creado_por: z.guid(),
  clase: z.enum(['preventa', 'final']),
  estado: z.enum(['activa', 'reportada', 'invalida']),
  titulo: z.string().nullable(),
  total_base: z.number(),
  moneda_mostrar: z.string().nullable(),
  creado_en: z.string(),
  vence_el: z.string(),
  vencida: z.boolean(),
})

export function filaDesde(f: z.infer<typeof esquemaDeFila>): FilaDelListado {
  return {
    id: f.id,
    numero: f.numero,
    origenId: f.origen_id,
    leadId: f.lead_id,
    vehiculoId: f.vehiculo_id,
    creadoPor: f.creado_por,
    clase: f.clase,
    estado: f.estado,
    titulo: f.titulo,
    totalBase: f.total_base,
    monedaMostrar: f.moneda_mostrar,
    creadoEn: f.creado_en,
    venceEl: f.vence_el,
    vencida: f.vencida,
  }
}
