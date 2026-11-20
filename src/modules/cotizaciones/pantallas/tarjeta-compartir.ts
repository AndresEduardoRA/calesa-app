// Pantallas que ofrecen «Compartir cotización» de una cotización que no es la de la página (el «⋯» del listado, las tarjetas y la tabla de vehículos, el resumen y la ficha
// del vehículo): el diálogo, que se monta una vez por pantalla, y lo que lo abre (`?panel=compartir&para=<id>`). Sólo cáscaras: el panel va por `diferido()`. Sólo
// `src/app` importa este archivo (`.claude/rules/modulos.md`).
export { DialogoDeCompartirDeLaFila } from '../features/tarjeta/components/compartir'
export { useAbrirCompartirDeLaFila } from '../features/tarjeta/hooks/use-abrir-compartir-de-la-fila'
