import 'server-only'
import { connection, type NextRequest } from 'next/server'
import { leerFormulaDeTrabajo } from '@/modules/cotizaciones'
import type { ParteDeLaFormula } from '@/shared/lib/rutas'
import { deLaBusqueda, redireccionPermanente } from '../../../con-parametros'
import { destinoDeLaFormulaVieja } from './url-vieja'

// Lo que responden los tres `route.ts` de la ruta corta: un 308 a esa parte de la fórmula de trabajo, leída con la sesión de quien pide (por persona: `private,
// no-store`, porque depende de lo que ve y de cuál es hoy la de trabajo). Una lectura que falla (sin sesión, sin permiso) va a la lista, que dice por qué.
export async function redirigirALaFormula(
  peticion: NextRequest,
  origenId: string,
  parte: ParteDeLaFormula,
): Promise<Response> {
  await connection()
  const trabajo = await leerFormulaDeTrabajo(origenId)
  const trabajoId = trabajo.ok && trabajo.data !== null ? trabajo.data.id : null
  return redireccionPermanente(
    destinoDeLaFormulaVieja(
      origenId,
      parte,
      trabajoId,
      deLaBusqueda(peticion.nextUrl.searchParams),
    ),
    { porPersona: true },
  )
}
