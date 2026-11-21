import type { NextRequest } from 'next/server'
import { redirigirALaFormula } from '../redirigir'

// La ruta corta `/configuracion/origenes/[id]/formula/hoja`: un 308 a la hoja de la fórmula de trabajo (`../url-vieja.ts`).
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/formula/hoja'>,
) {
  return redirigirALaFormula(peticion, (await params).id, 'hoja')
}
