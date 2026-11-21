// Lo que el área `aprobada` suma al listado de cotizaciones: «Aprobar» en el «⋯» de cada fila (con la pregunta de una privada) y «Comparar» del modal de un grupo (el
// hueco `Comparar`, diferido).
// Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que `/cotizaciones` pide y nada más.
export { aprobarLaCotizacion } from '../features/aprobada/hooks/aprobar-la-cotizacion'
export { useAprobarPrivadaPorUrl } from '../features/aprobada/hooks/use-aprobar-privada-por-url'
export { DialogoDeAprobarPrivada } from '../features/aprobada/components/aprobar-privada/dialogo-de-aprobar-privada'
export { CompararDelGrupoDiferido } from '../features/aprobada/components/comparar-del-grupo'
