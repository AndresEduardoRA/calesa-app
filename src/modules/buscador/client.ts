// La entrada de CLIENTE del módulo `buscador` (`@/modules/buscador/client`): las lecturas por sección desde el navegador (cancelables), los últimos abiertos, las reglas puras
// de orden y agrupación y sus tipos. La paleta (7.13) y el selector `#` de chat (7.10) la importan; el texto lo interpretan con `interpretarBusqueda()`
// de `@/modules/leads/client` antes de pedir.
export {
  BUSCAR_POR_SECCION,
  buscarCotizaciones,
  buscarLeads,
  buscarVehiculos,
  type PedidoDeBusqueda,
} from './infra/buscar.client'
export { leerUltimosAbiertos } from './infra/visitados.client'
// Elegir un lead de mi cartera (diferido): «Nuevo» del shell lo toma por `shell.client.ts`; el formulario de un evento de la agenda, por aquí.
export { ElegirLeadDiferido as ElegirLead } from './features/elegir-lead/components/diferidos'
export {
  agruparResultados,
  POR_SECCION,
  seccionesQueBuscan,
  TIPOS_DEL_BUSCADOR,
  type Abierto,
  type Interpretacion,
  type LeidasPorTipo,
  type Seccion,
  type TipoDelBuscador,
} from './entities/ranking'
export type {
  FilaDeCotizacion,
  FilaDeLead,
  FilaDeVehiculo,
  FilaPorTipo,
} from './entities/resultados'
