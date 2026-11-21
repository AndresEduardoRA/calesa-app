// La API de servidor del área `formula` de `cotizaciones`. Sale por el `index.ts` de la raíz.
//
// La pestaña «Fórmula» de la página del origen (4.20-2a) lee dentro de su Server Component (`pantallas/formula.ts`), por la composición del área. La fórmula de
// trabajo de un origen sale para la cabeza de la página, que pone en ella «Empezar desde una plantilla».
export { leerFormulaDeTrabajo } from './composicion'
