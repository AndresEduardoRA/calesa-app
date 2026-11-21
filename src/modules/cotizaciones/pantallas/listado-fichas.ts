// Lo que dibuja `/leads/[id]` y `/vehiculos/[id]` del listado en su bloque de cotizaciones (sólo `src/app`): las tarjetas del lead al acercarse a la vista, la fila de tarjetas con sus
// estados que `aprobada` pide por hueco para el vehículo (con su código diferido). La imagen de la tarjeta y «Compartir» son del área `tarjeta`: los une la ruta.
// Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export { TarjetasDelLeadAlAcercarse as TarjetasDelLead } from '../features/listado/components/fichas/al-acercarse'
export { TarjetasDeLaFichaDiferida as TarjetasDeLaFicha } from '../features/listado/components/fichas/diferidos'
