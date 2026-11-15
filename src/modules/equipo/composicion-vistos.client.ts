// Composición de «visto» en el navegador. Aparte de `composicion.client.ts` a propósito: lo que lleva trae supabase-js, y una lista no lo carga
// en frío para marcar lo visto. Sólo se pide con `import()` desde `features/vistos/pedidos-de-vistos.ts` (y sólo con «Vistos» encendido).
export { leerVistosDelContexto, registrarVisto } from './infra/vistos.client'
