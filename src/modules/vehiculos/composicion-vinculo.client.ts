// Composición aparte para leer el vínculo de un vehículo desde la pantalla de otro módulo (el lead por defecto de «Nuevo proyecto» de repuestos): se pide
// con `import()` al elegir el vehículo y no arrastra el resto de `composicion.client.ts` (fotos, apibara, papelera).
export { leerVinculosDelVehiculo } from './infra/relacionados.client'
