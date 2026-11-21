import type { NextRequest } from 'next/server'
import { responderSubrutaVieja } from '../subruta-vieja'

// `/configuracion/leads/seguimientos` ya no es una página: es una tarjeta de `/configuracion/leads` (un 308, con su consulta).
export function GET(peticion: NextRequest) {
  return responderSubrutaVieja('seguimientos', peticion)
}
