import type { NextRequest } from 'next/server'
import { deLaBusqueda, redireccionPermanente } from '../con-parametros'
import { destinoDeLaUrlVieja } from './url-vieja'

// `/configuracion/cotizacion` ya no tiene página: un 308 del servidor adonde vive hoy lo que pedía (`url-vieja.ts`). La página de destino
// comprueba el permiso.
export function GET(peticion: NextRequest) {
  return redireccionPermanente(destinoDeLaUrlVieja(deLaBusqueda(peticion.nextUrl.searchParams)))
}
