import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  datosClaveDesde,
  resolverDatosClave,
  type DatoClaveResuelto,
} from '../../entities/datos-clave'
import { TIPOS_DE_ORIGEN } from '../../entities/origen'

const esquemaFila = z.object({ tipo: z.enum(TIPOS_DE_ORIGEN), datos_clave: z.unknown() })
const esquemaCampos = z.array(z.object({ id: z.guid(), clave: z.string(), etiqueta: z.string() }))

// Los datos clave de un origen para la ficha de un vehículo: una fila por PK y, si alguno es un campo, esos campos activos (como mucho 4).
// Una lectura por request.
export const getDatosClave = cache(
  async (origenId: string): Promise<Resultado<DatoClaveResuelto[]>> => {
    const supabase = await createClient()
    // origenes_pkey
    const { data, error } = await supabase
      .from('origenes')
      .select('tipo, datos_clave')
      .eq('id', origenId)
      .limit(1)
      .maybeSingle()
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    if (!data) {
      return fallo('no_encontrado', 'Ese origen ya no existe.')
    }
    const fila = esquemaFila.parse(data)
    const guardados = datosClaveDesde(fila.datos_clave)
    const claves = guardados.flatMap((dato) => ('campo' in dato ? [dato.campo] : []))
    if (claves.length === 0) {
      return ok(resolverDatosClave(fila.tipo, guardados, []))
    }
    // origenes_campos_origen_id_clave_key (origen_id, clave)
    const campos = await supabase
      .from('origenes_campos')
      .select('id, clave, etiqueta')
      .eq('origen_id', origenId)
      .eq('activo', true)
      .in('clave', claves)
      .limit(claves.length)
    if (campos.error) {
      return { ok: false, error: errorDePostgrest(campos.error) }
    }
    return ok(resolverDatosClave(fila.tipo, guardados, esquemaCampos.parse(campos.data)))
  },
)
