// El esqueleto de «Comparar cotizaciones», aparte de `pantallas/aprobada-comparar.ts`: lo importan el `loading.tsx` de la ruta y el `<Suspense>` de la página sin el barril
// de la tabla (con él, el HTML en frío bajaría dos chunks casi iguales, como pasaba con la hoja). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export { EsqueletoDeComparar } from '../features/aprobada/components/comparar/esqueleto-de-comparar'
