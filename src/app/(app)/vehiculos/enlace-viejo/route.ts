import { connection, NextResponse, type NextRequest } from 'next/server'
import { destinoDeLaSituacionVieja } from '@/modules/vehiculos'
import { RUTAS } from '@/shared/lib/rutas'

// El inventario con el filtro «Situación» de antes (`/vehiculos?situacion=`): `src/proxy.ts` lo reescribe hasta acá y esta ruta responde
// 308 al mismo pedido con «Subasta» y «Fase» (`destinoDeLaSituacionVieja()`). Un route handler y no la página: la página redirige ya
// mandado su esqueleto, con 200. No lee la sesión ni la base (la puerta es el proxy).
export async function GET(request: NextRequest) {
  // Antes de toda rama: con `cacheComponents`, `next build` prerenderizaría la ruta.
  await connection()
  const parametros: Record<string, string[]> = {}
  for (const [clave, valor] of request.nextUrl.searchParams) {
    ;(parametros[clave] ??= []).push(valor)
  }
  const destino = destinoDeLaSituacionVieja(parametros) ?? RUTAS.vehiculos
  return NextResponse.redirect(new URL(destino, request.nextUrl.origin), 308)
}
