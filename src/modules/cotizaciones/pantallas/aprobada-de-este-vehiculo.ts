// «De este vehículo» para otra pantalla que la dibuje entera (la ficha del vehículo): la isla que lee y pide su código al acercarse. Props: `vehiculo`,
// `cotizacionActual` (opcional), `aprobarEn` (del servidor: `origenesCon(permisos, 'cotizaciones.aprobar')`), `conCasillas` con `volverA` (las casillas y «Comparar») y
// `vacio` (el texto sin ninguna; la ficha del vehículo, que además pasa `alCambiar` desde un envoltorio de cliente para refrescar la aprobada de su izquierda). Sólo `src/app`
// importa este archivo (`.claude/rules/modulos.md`).
export { DeEsteVehiculoAlAcercarse as DeEsteVehiculo } from '../features/aprobada/components/de-este-vehiculo/al-acercarse'
