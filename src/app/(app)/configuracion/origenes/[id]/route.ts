import type { NextRequest } from 'next/server'
import { deLaBusqueda, redireccionPermanente } from '../../con-parametros'
import { destinoDeLaUrlVieja } from './url-vieja'

// `/configuracion/origenes/<id>` sin pestaña: un 308 del servidor a la primera (o a la de `?seccion=`), con su consulta (`url-vieja.ts`).
// La pestaña comprueba el permiso y el 404.
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]'>,
) {
  const { id } = await params
  return redireccionPermanente(destinoDeLaUrlVieja(id, deLaBusqueda(peticion.nextUrl.searchParams)))
}
