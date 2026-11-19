// Pantalla del área `tarjeta` de `cotizaciones` para la pestaña «Tarjeta» de Configuración › Cotización. Sólo `src/app` importa este archivo: reexporta lo que esa
// pantalla dibuja y nada más, y por eso no pesa en `/cotizaciones/nuevo` (que importa `pantallas/tarjeta.ts`).
//
// El lienzo del editor de la plantilla: la página lo pasa por el hueco `Lienzo` del editor (`entities/vista-previa-de-la-plantilla.ts`).
export { LienzoDeLaPlantillaDiferido } from '../features/tarjeta/components/diferidos'
