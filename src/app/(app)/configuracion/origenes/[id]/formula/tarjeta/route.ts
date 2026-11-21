import type { NextRequest } from 'next/server'
import { redirigirALaFormula } from '../redirigir'

// La ruta corta `/configuracion/origenes/[id]/formula/tarjeta`: un 308 a la tarjeta de la fórmula de trabajo (`../url-vieja.ts`).
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/formula/tarjeta'>,
) {
  return redirigirALaFormula(peticion, (await params).id, 'tarjeta')
}
