// Lo que el área `final` suma al listado de cotizaciones: «Marcar final…» en el «⋯» de cada fila y su diálogo. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que `/cotizaciones` pide y nada más.
export { DialogoDeMarcarFinalDeLaFila } from '../features/final/components/dialogo-de-marcar-final-de-la-fila'
export { useAbrirMarcarFinalDeLaFila } from '../features/final/hooks/use-abrir-marcar-final-de-la-fila'
