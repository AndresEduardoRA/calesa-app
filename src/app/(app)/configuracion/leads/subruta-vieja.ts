import type { NextRequest } from 'next/server'
import { destinoDeLaSubrutaVieja, type ClaveDeFamilia } from '@/modules/leads'
import { redireccionPermanente } from '../con-parametros'

// El `route.ts` de una sub-ruta vieja de Configuración › Leads (`/origenes`, `/tipos`, `/seguimientos`, `/embudo`, `/portal`, `/telefonos`): un 308 a
// la tarjeta que la reemplazó, con su `?panel=` y el resto de la consulta. El destino no depende de quién pide: se puede guardar.
export function responderSubrutaVieja(clave: ClaveDeFamilia, peticion: NextRequest): Response {
  return redireccionPermanente(destinoDeLaSubrutaVieja(clave, peticion.nextUrl.searchParams))
}
