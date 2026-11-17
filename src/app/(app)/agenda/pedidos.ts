import {
  leerEvento,
  leerIdDeUrl,
  leerRecordatorio,
  leerTarea,
  puedeCompletarTarea,
  puedeEditarEvento,
  puedeEditarTarea,
  puedeReasignarTarea,
  type DetalleDeEvento,
  type DetalleDeTarea,
} from '@/modules/agenda'
import { leerLeadParaEnlazar } from '@/modules/leads'
import { datosO, ok, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'

type Parametros = Record<string, string | string[] | undefined>

// Lo que cada panel necesita saber de quien mira: qué botones se dibujan (la base lo vuelve a exigir).
function eventoPedido(
  id: string | null,
  detalle: DetalleDeEvento | null,
  yo: string,
  permisos: Permisos,
) {
  return id
    ? {
        id,
        detalle,
        puedeEditar:
          detalle !== null && puedeEditarEvento({ ...detalle, eliminado: false }, yo, permisos),
      }
    : null
}

function tareaPedida(
  id: string | null,
  detalle: DetalleDeTarea | null,
  yo: string,
  permisos: Permisos,
) {
  return id
    ? {
        id,
        detalle,
        puedeEditar: detalle !== null && puedeEditarTarea(detalle, yo),
        puedeCompletar: detalle !== null && puedeCompletarTarea(detalle, yo),
        puedeReasignar: detalle !== null && puedeReasignarTarea(detalle, yo, permisos),
      }
    : null
}

// El nombre del lead del evento, de `leads` (con la sesión de quien mira: si no lo ve, queda sin nombre y el panel dice «Ver el lead»). Un error del lead no tira
// el panel: el evento se ve igual.
async function conNombreDelLead(
  lectura: Resultado<DetalleDeEvento | null>,
  permisos: Permisos,
): Promise<Resultado<DetalleDeEvento | null>> {
  const lead = lectura.ok ? lectura.data?.lead : null
  if (!lectura.ok || !lectura.data || !lead || !puede(permisos, 'leads.ver')) {
    return lectura
  }
  const leido = await leerLeadParaEnlazar(lead.id)
  return leido.ok && leido.data
    ? ok({ ...lectura.data, lead: { id: lead.id, nombre: leido.data.nombre } })
    : lectura
}

// `?evento=`, `?tarea=` y `?recordatorio=` abren su panel: el detalle se lee por id en la misma ronda que el calendario, y sólo si la URL lo pide. El nombre del
// lead del evento va encadenado a su lectura.
export async function leerPedidosDeLaUrl(parametros: Parametros, yo: string, permisos: Permisos) {
  const eventoId = leerIdDeUrl(unParametro(parametros['evento']))
  const tareaId = leerIdDeUrl(unParametro(parametros['tarea']))
  const recordatorioId = leerIdDeUrl(unParametro(parametros['recordatorio']))
  const [evento, tarea, recordatorio] = await Promise.all([
    eventoId ? leerEvento(eventoId, yo).then((l) => conNombreDelLead(l, permisos)) : null,
    tareaId ? leerTarea(tareaId) : null,
    recordatorioId ? leerRecordatorio(recordatorioId) : null,
  ])
  return {
    evento: eventoPedido(eventoId, evento ? datosO(evento) : null, yo, permisos),
    tarea: tareaPedida(tareaId, tarea ? datosO(tarea) : null, yo, permisos),
    recordatorio: recordatorioId
      ? { id: recordatorioId, detalle: recordatorio ? datosO(recordatorio) : null }
      : null,
  }
}
