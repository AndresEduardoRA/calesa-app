// Lo de la cotización que la tarjeta muestra y no es un nodo de la fórmula (las variables de una celda: `fecha_larga`, `numero`, `asesor_nombre`…), ya formateado. Sólo
// el tipo, sin código: vive en el núcleo porque lo nombran dos áreas, `tarjeta` (lo arma con `contextoDeLaPagina()` y lo dibuja) y `plantilla` (la referencia del lienzo
// del editor, `referencia-de-la-tarjeta.ts`). Una variable sin valor (nulo) se dibuja vacía (D8 de T310).

// El asesor de la tarjeta: **quien la mira o la comparte**, nunca quien la creó (ese es el autor). El teléfono es el WhatsApp de «Tu ficha en la web» tal cual se
// guardó (E.164), el cargo el de esa ficha y la foto la URL pública de su foto de perfil (`''` en las cifras de ejemplo: la muestra punteada «Foto»).
export type AsesorDeLaTarjeta = {
  nombre: string
  telefono: string | null
  cargo: string | null
  foto: string | null
}

export type ContextoDeLaCotizacion = {
  // «6 nov 2026»: el día de hoy en la hoja nueva y el del último guardado en una guardada.
  fecha: string
  // El número pelado de una guardada; nulo en la hoja nueva.
  numero: string | null
  // El título de la cotización.
  titulo: string | null
  // Quien mira o comparte; nulo si su perfil no se leyó.
  asesor: AsesorDeLaTarjeta | null
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
