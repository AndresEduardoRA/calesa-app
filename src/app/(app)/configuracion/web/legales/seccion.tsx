import { connection } from 'next/server'
import { leerLegales } from '@/modules/web'
import { TarjetasDeLegales } from '@/modules/web/pantallas/sitio-legales'
import { datosO } from '@/shared/lib/errores'

// «Legales» (8.03-2). Se lee la fila de ajustes con su versión; si no se puede, el `error.tsx` con «Reintentar» (nunca tarjetas vacías que se
// editarían encima). Sin `key`: las tarjetas y sus modales reciben lo guardado por props y cada modal arranca de cero en cada apertura.
export async function SeccionLegales() {
  await connection()
  const legales = datosO(await leerLegales())
  return <TarjetasDeLegales legales={legales} />
}
