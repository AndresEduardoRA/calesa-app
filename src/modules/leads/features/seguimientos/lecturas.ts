import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import {
  leerRecordatoriosDelLead,
  leerSeguimientos,
  leerTiposDeSeguimiento,
} from '../../composicion'
import type { TipoDeSeguimiento } from '../../entities/alta'
import {
  PRIMEROS_DE_RECORDATORIOS,
  PRIMEROS_DE_SEGUIMIENTOS,
} from '../../entities/bloques-de-la-ficha'
import type { PaginaDeRecordatorios } from '../../entities/pagina-de-recordatorios'
import type { PaginaDeSeguimientos } from '../../entities/seguimiento'

export type ResumenDeSeguimientos = {
  // Los últimos que quien mira ve (la RLS decide), con `hayMas`.
  seguimientos: PaginaDeSeguimientos
  // Sus pendientes más próximos, con `hayMas` y si tiene completados.
  recordatorios: PaginaDeRecordatorios
  // Los activos: lo que ofrece el redactor.
  tipos: TipoDeSeguimiento[]
}

// El bloque «Seguimiento» de la ficha: los últimos seguimientos, el recordatorio pendiente más próximo y los tipos
// activos, en paralelo y con un tope cada uno (`PRIMEROS_DE_*`). Lo demás lo lee «Ver todos» desde el navegador, por páginas.
export async function leerResumenDeSeguimientos(
  leadId: string,
): Promise<Resultado<ResumenDeSeguimientos>> {
  const [seguimientos, recordatorios, tipos] = await Promise.all([
    leerSeguimientos({ leadId, antes: null, tamano: PRIMEROS_DE_SEGUIMIENTOS }),
    leerRecordatoriosDelLead({ leadId, tamano: PRIMEROS_DE_RECORDATORIOS }),
    leerTiposDeSeguimiento(),
  ])
  if (!seguimientos.ok) {
    return seguimientos
  }
  if (!recordatorios.ok) {
    return recordatorios
  }
  if (!tipos.ok) {
    return tipos
  }
  return ok({
    seguimientos: seguimientos.data,
    recordatorios: recordatorios.data,
    tipos: tipos.data,
  })
}
