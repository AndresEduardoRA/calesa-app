// Lo que el área `aprobada` suma al listado de cotizaciones: «Aprobar» en el «⋯» de cada fila y «Comparar» de un grupo desplegado (el hueco `Comparar`, diferido).
// Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que `/cotizaciones` pide y nada más.
export { aprobarLaCotizacion } from '../features/aprobada/hooks/aprobar-la-cotizacion'
export { CompararDelGrupoDiferido } from '../features/aprobada/components/comparar-del-grupo'
