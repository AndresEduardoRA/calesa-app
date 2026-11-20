// La composición del área `listado` en el navegador: el despliegue de un grupo de la lista agrupada. La importa sólo su hook; ningún barril la reexporta (lo que
// suma un `client.ts` lo paga toda pantalla que importa `@/modules/cotizaciones/client`).
export { leerGrupoDelListado } from '../../infra/listado/grupo-del-listado.client'
// Las cotizaciones de la ficha del lead (la fila de tarjetas): su lectura desde el navegador.
export { leerTarjetasDelLead } from '../../infra/listado/tarjetas-del-lead.client'
export type { TarjetasDelLead } from '../../infra/listado/tarjetas-del-lead.client'
