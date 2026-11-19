// Las claves de la hoja de cotizar: la `key` de React con la que se vuelve a montar, y las de la pestaña (`sessionStorage`) donde viven el pendiente del guardado y el
// borrador. El pendiente es por persona y por hoja (origen, lead y vehículo): otra hoja, u otra cuenta que entra en la misma pestaña, no reenvía el de ésta. El borrador
// es por persona, origen y vehículo, **sin el lead** (4.14-3b, P1): elegir o cambiar el cliente vuelve a montar la hoja y lo tipeado se repone con su aviso.

// Lleva la hoja abierta: cada una nueva («Recargar», «Usar la versión nueva», un `router.refresh()` con la misma versión) vuelve a montar la hoja, así el recálculo y el guardado
// usan la misma (D2) y el borrador repone lo tipeado. `vuelta` la sube el marco para volver a montarla vacía («Descartar»).
export const claveDeLaHoja = ({
  formulaId,
  vehiculoId,
  vuelta,
  abierta,
}: {
  formulaId: string
  vehiculoId: string | null
  vuelta: number
  abierta: string
}): string => `${formulaId}:${vehiculoId ?? '-'}:${String(vuelta)}:${abierta}`

// La hoja de una persona en la pestaña.
export type DeLaPestana = {
  personaId: string
  origenId: string
  leadId: string | null
  vehiculoId: string | null
}

const deLaHoja = ({ personaId, origenId, leadId, vehiculoId }: DeLaPestana) =>
  `${personaId}:${origenId}:${leadId ?? '-'}:${vehiculoId ?? '-'}`

export const claveDelPendiente = (h: DeLaPestana): string => `cotizar-pendiente:${deLaHoja(h)}`

// `leadId` se acepta y se ignora: quien llama arma una sola `DeLaPestana` para el borrador y el pendiente.
export const claveDelBorrador = ({
  personaId,
  origenId,
  vehiculoId,
}: Omit<DeLaPestana, 'leadId'> & { leadId?: string | null }): string =>
  `cotizar:${personaId}:${origenId}:${vehiculoId ?? '-'}`

// Una cotización guardada (`/cotizaciones/[id]`, 4.15-3): el pendiente es de una persona y una cotización; el borrador lleva además su versión (`actualizadoEn`, el texto de la
// base): después de «Recargar» por un conflicto, lo tipeado no vuelve entero sobre la versión de la otra persona.
export type DeUnaGuardada = { personaId: string; cotizacionId: string }

export const claveDelPendienteDeUnaGuardada = ({ personaId, cotizacionId }: DeUnaGuardada) =>
  `cotizar-guardada-pendiente:${personaId}:${cotizacionId}`

// El borrador del título de la cotización (T307), como el de la hoja: en la nueva por persona, origen y el vehículo con que se abrió (otra hoja con otro vehículo no
// hereda un título manual; elegir otro vehículo en ésta no lo cambia); en una guardada por persona, cotización y versión (tras un PT409 no vuelve sobre la ajena).
export const claveDelTitulo = ({
  personaId,
  origenId,
  vehiculoAlAbrir,
}: {
  personaId: string
  origenId: string
  vehiculoAlAbrir: string | null
}): string => `cotizar-titulo:${personaId}:${origenId}:${vehiculoAlAbrir ?? '-'}`

export const claveDelTituloDeUnaGuardada = ({
  personaId,
  cotizacionId,
  actualizadoEn,
}: DeUnaGuardada & { actualizadoEn: string }): string =>
  `cotizar-guardada-titulo:${personaId}:${cotizacionId}:${actualizadoEn}`

export const claveDelBorradorDeUnaGuardada = ({
  personaId,
  cotizacionId,
  actualizadoEn,
}: DeUnaGuardada & { actualizadoEn: string }) =>
  `cotizar-guardada:${personaId}:${cotizacionId}:${actualizadoEn}`

// Las claves de una hoja en par (glosario: «Variante en par»): las de la hoja con su marca, porque el pendiente y el borrador del par tienen otra forma.
export const claveEnPar = (clave: string): string => `${clave}:par`
