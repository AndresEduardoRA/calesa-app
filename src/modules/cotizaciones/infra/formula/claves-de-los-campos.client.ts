// Las claves de los campos del origen, desde el navegador y con la sesión de quien edita: con ellas la planilla marca las filas cuyo dato del vehículo no existe en
// este origen (`camposQueFaltan()`, la copia de una fórmula de otro origen). Una lectura al montarse, sólo si la definición nombra un dato que no es común. La policy de
// `origenes_campos` la abre a todo `authenticated`.
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { TOPE_DE_CAMPOS_DEL_ORIGEN } from '../../entities/campos-que-faltan'

const esquemaDeLasClaves = z.array(z.object({ clave: z.string() }))

// Por `origenes_campos_origen_id_clave_key (origen_id, clave)`.
export async function leerClavesDeLosCampos(origenId: string): Promise<Resultado<string[]>> {
  const { data, error } = await createClient()
    .from('origenes_campos')
    .select('clave')
    .eq('origen_id', origenId)
    .limit(TOPE_DE_CAMPOS_DEL_ORIGEN)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const claves = esquemaDeLasClaves.safeParse(data)
  if (!claves.success) return fallo('inesperado', 'No pudimos leer los campos del origen.')
  return ok(claves.data.map((fila) => fila.clave))
}
