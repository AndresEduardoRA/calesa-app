// Pantalla del área `tarjeta` de `cotizaciones` para la pestaña «Fórmula» de la página del origen. Sólo `src/app` importa este archivo: reexporta lo que esa
// pantalla dibuja y nada más (no pesa en `/cotizaciones/nuevo`, que importa `pantallas/tarjeta.ts`).
//
// La tarjeta en vivo de la planilla: la página la pasa por el hueco `TarjetaEnVivo` de la sección de la fórmula (`entities/tarjeta-en-vivo.ts`).
export { TarjetaEnVivoDiferida } from '../features/tarjeta/components/tarjeta-en-vivo/diferidos'
