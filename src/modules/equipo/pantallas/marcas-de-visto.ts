// Las marcas de «visto» de una lista de otro módulo. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`). Va aparte de `client.ts`
// a propósito: ese barril trae también `VistasGuardadas` (≈ 70 KB) y `/cotizaciones` se pasaba de su presupuesto de JS; acá sólo viaja el proveedor.
export { MarcasDeVistoDeLaPagina } from '../features/vistos/components/marcas-de-visto-de-la-pagina'
