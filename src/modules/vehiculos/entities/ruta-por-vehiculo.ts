// Una ruta que nombra un vehículo y que arma otro módulo («Ver actividad»: `actividad`). `vehiculos` no conoce ese módulo, así que `src/app` la arma
// una sola vez por página con `MARCADOR_DE_VEHICULO` en el lugar del id y cada fila pone el suyo al elegir la acción. Ningún pedido por fila.

// Un uuid que no es de nadie (la plantilla tiene que pasar las mismas validaciones que un id).
export const MARCADOR_DE_VEHICULO = '00000000-0000-4000-8000-000000000000'

// La plantilla con el id de este vehículo.
export function rutaDelVehiculo(plantilla: string, vehiculoId: string): string {
  return plantilla.replaceAll(MARCADOR_DE_VEHICULO, encodeURIComponent(vehiculoId))
}
