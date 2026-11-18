import { datosO } from '@/shared/lib/errores'
import { leerTonosDelCatalogo } from '../../../areas/diseno/composicion'
import { ColoresDelCatalogoDiferido } from './diferidos'

// La pestaña «Colores» de Configuración › Cotización (clave técnica `tonos`), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`. La pestaña
// ya pide `cotizaciones.configurar` y la base lo vuelve a pedir al escribir (la lectura la puede cualquiera con sesión). Una lectura que falla sube al `error.tsx` de
// la ruta, que ofrece «Reintentar».
export async function SeccionDeLosColores() {
  return <ColoresDelCatalogoDiferido lista={datosO(await leerTonosDelCatalogo())} />
}
