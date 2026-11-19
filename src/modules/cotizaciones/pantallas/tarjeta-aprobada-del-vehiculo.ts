// Lo del área `tarjeta` que dibuja «Cotización aprobada» en la ficha del vehículo (`pantallas/aprobada-del-vehiculo.ts` pone la tarjeta; `src/app`
// la compone, porque un área no importa otra): la portada diferida y «Compartir» de la fila. Sólo `src/app` importa este archivo.
export { PortadaDeLaCotizacionDiferida } from '../features/tarjeta/components/portada/diferidos'
export { BotonDeCompartirDeLaFila } from '../features/tarjeta/components/compartir/boton-de-compartir-de-la-fila'
