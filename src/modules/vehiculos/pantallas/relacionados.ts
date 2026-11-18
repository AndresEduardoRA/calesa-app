// Pantalla: el bloque «Relacionados» de cada detalle (la ficha del vehículo, la unidad de logística y la ficha del lead; el del inventario va dentro de su
// resumen). Lo compone `app/`: `leads` y `logistica` no importan `vehiculos`. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esas pantallas dibujan y nada más.
export { RelacionadosDelVehiculoCliente } from '../features/relacionados/components/relacionados-del-vehiculo-cliente'
export { RelacionadosDelLeadCliente } from '../features/relacionados/components/relacionados-del-lead-cliente'
export { EsqueletoDeRelacionados } from '../features/relacionados/components/esqueleto-de-relacionados'
export type {
  HuecosDeRelacionados,
  PropsDeElegirLead,
} from '../features/relacionados/components/huecos'
