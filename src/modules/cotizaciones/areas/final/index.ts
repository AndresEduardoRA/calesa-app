// La API de servidor del área `final` de `cotizaciones` (4.15-4): la llena su paso. Sale por el `index.ts` de la raíz.
//
// Quién ve «Marcar final» y por qué está apagado: las reglas puras que la página de `src/app` une para el «⋯» de cada fila del listado. El diálogo y su botón salen por
// `pantallas/final-cotizacion.ts` (la guardada) y `pantallas/final-listado.ts` (el listado).
export { motivoParaNoMarcar, puedeMarcarLaFinal } from '../../entities/final/acceso'
