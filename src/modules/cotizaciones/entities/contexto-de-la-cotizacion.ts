// Lo de la cotización que la tarjeta muestra y no es un nodo de la fórmula (las variables de una celda: `fecha_larga`, `numero`, `asesor_nombre`…), ya formateado. Sólo
// el tipo, sin código: vive en el núcleo porque lo nombran dos áreas, `tarjeta` (lo arma con `contextoDeLaPagina()` y lo dibuja) y `plantilla` (la referencia del lienzo
// del editor, `referencia-de-la-tarjeta.ts`). Una variable sin valor (nulo) se dibuja vacía (D8 de T310).
export type ContextoDeLaCotizacion = {
  // «6 nov 2026»: el día de hoy en la hoja nueva y el del último guardado en una guardada.
  fecha: string
  // El número pelado de una guardada; nulo en la hoja nueva.
  numero: string | null
  // El título de la cotización.
  titulo: string | null
  asesor: string | null
  // El nombre del cliente, sólo si quien arma la página lo ve.
  cliente: string | null
  vehiculo: { titulo: string; lote: string | null; vin: string | null } | null
  // «20 nov 2026»: el día en que vence; nulo sin vencimiento.
  venceEl: string | null
  // El nombre de la empresa (la variable `empresa_nombre`); nulo si quien arma la página no lo leyó.
  empresa: string | null
  // El logo de la empresa, si tiene uno.
  logo: { nombre: string; url: string } | null
}
