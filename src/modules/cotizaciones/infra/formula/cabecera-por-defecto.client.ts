// La cabecera de la publicada al abrir el ⚙ de la cabecera, desde el navegador y con la sesión de quien lo abre: una lectura por pedido. La consulta y su índice
// están en `consulta-de-la-cabecera.ts`.
import { z } from 'zod'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { leerCabeceraSobre, type CabeceraPublicada } from './consulta-de-la-cabecera'

export async function leerCabeceraPublicada(
  origenId: string,
): Promise<Resultado<CabeceraPublicada | null>> {
  if (!z.guid().safeParse(origenId).success) {
    return fallo('validacion', 'Ese origen no es válido.')
  }
  return leerCabeceraSobre(createClient(), origenId)
}
