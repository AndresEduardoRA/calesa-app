// Una acción del «⋯» de una fila del listado que abre un diálogo (marcar final, reportar, moderar) lo lleva en la URL, como en el listado de leads: `?panel=<el de la guardada>&para=<id>`.
// `?cotizacion=` es del resumen, que puede estar abierto debajo. Sin imports: lo leen los diálogos de las áreas `final` y `comentarios`.
export const CLAVE_DE_LA_FILA = 'para'

// Lo que se dice si la URL nombra una fila que no está en la página, que ya no ofrece esa acción o que no es de quien mira: es lo mismo que decir que no existe.
export const MENSAJE_DE_LA_FILA_NO_DISPONIBLE =
  'Esa cotización ya no está en esta página o ya no puedes hacerlo. Recarga para ver cómo quedó.'
