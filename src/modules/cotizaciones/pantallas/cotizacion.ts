// Lo que dibuja `/cotizaciones/[id]` (sólo `src/app`): la cabecera de la cotización, la hoja con su marco y el esqueleto.
export { CabeceraDeLaGuardada } from '../features/hoja/components/cabecera-de-la-guardada'
export { EsqueletoDeHoja } from '../features/hoja/components/esqueleto-de-hoja'
// El «⋯» de la cabecera: su proveedor envuelve la cabecera y la hoja (cada uno suma sus líneas desde donde vive).
export { ProveedorDelMenuDeLaGuardada } from '../features/hoja/components/menu-de-la-guardada'
export { PantallaDeUnaGuardada } from '../features/hoja/components/pantalla-de-una-guardada'
// El título de la cotización (T307): su proveedor (sobre la cabecera y la hoja) y el campo, arriba del panel del vehículo de la barra de la cabecera.
export { CampoDelTituloDiferido, ProveedorDelTitulo } from '../features/hoja/components/titulo'
