// «Comparar cotizaciones» (`/cotizaciones/comparar?ids=&returnTo=`): la tabla lado a lado con «Aprobar esta» (props: el modelo de `compararCotizaciones()` y `aprobarEn`),
// y lo que dice la página si no se comparan (`volverA`); el esqueleto va en `pantallas/aprobada-esqueleto-de-comparar.ts`. No trae la hoja: sólo `ValorDeNodo`, `<Monto>` y la action de aprobar. Sólo `src/app` importa este
// archivo (`.claude/rules/modulos.md`).
export { NoSeComparan, TablaDeComparar } from '../features/aprobada/components/comparar'
