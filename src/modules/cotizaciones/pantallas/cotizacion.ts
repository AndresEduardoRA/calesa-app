// Lo que dibuja `/cotizaciones/[id]` (sólo `src/app`): la cabecera de la cotización, la hoja con su marco y el esqueleto.
export { CabeceraDeLaGuardada } from '../features/hoja/components/cabecera-de-la-guardada'
export { EsqueletoDeHoja } from '../features/hoja/components/esqueleto-de-hoja'
export { PantallaDeUnaGuardada } from '../features/hoja/components/pantalla-de-una-guardada'
// Las hermanas (glosario: «Cotizaciones hermanas»): la cáscara diferida de las dos abiertas juntas y el enlace a la otra (sin JS propio).
export { PantallaDeUnParGuardadoDiferida } from '../features/hoja/components/par'
export { EnlaceALaHermana } from '../features/hoja/components/par/enlace-a-la-hermana'
// El título de la cotización (T307): su proveedor (sobre la cabecera y la hoja) y el campo, arriba del panel del vehículo de la barra de la cabecera.
export { CampoDelTituloDiferido, ProveedorDelTitulo } from '../features/hoja/components/titulo'
