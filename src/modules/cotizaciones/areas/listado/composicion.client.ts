// La composición del área `listado` en el navegador: el despliegue de un grupo de la lista agrupada. La importa sólo su hook; ningún barril la reexporta (lo que
// suma un `client.ts` lo paga toda pantalla que importa `@/modules/cotizaciones/client`).
export { leerGrupoDelListado } from '../../infra/listado/grupo-del-listado.client'
