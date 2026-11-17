// El lead de un evento (una cita con un cliente): lo que el formulario elige y lo que viaja a `evento_crear` y `evento_guardar` (`p_datos.lead_id`). La base
// exige verlo (`trg_lead_visible`: 42501 con hint `lead_id`). Puro.

// `nombre` nulo: el evento lo nombra pero quien mira no lo ve (o todavía no se leyó).
export type LeadElegido = { id: string; nombre: string | null }

// Al guardar: sin valor en el formulario (el chat no lo edita) no se toca; si cambió el id, va el nuevo (nulo: quitarlo). El nombre no cuenta.
export function cambioDelLead(
  original: LeadElegido | null,
  elegido: LeadElegido | null | undefined,
): { lead_id?: string | null } {
  if (elegido === undefined) {
    return {}
  }
  const antes = original ? original.id : null
  const ahora = elegido ? elegido.id : null
  return antes === ahora ? {} : { lead_id: ahora }
}
