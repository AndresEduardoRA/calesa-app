// Crear una tabla de referencia, cambiar sus columnas y desactivarla (docs/COTIZADOR.md › «Crear, columnas y desactivar») con el cliente de la sesión de quien lo
// hace: las RPC vuelven a pedir el permiso (en una compartida, el de cada origen que la usa), comparan la versión y validan.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/shared/types/database.types'
import type { RepositorioDeTablas } from '../../entities/tablas/repositorio'
import {
  resultadoDeColumnas,
  resultadoDeCrear,
  resultadoDeDesactivar,
} from '../../entities/tablas/resultado-de-estructura'

export function estructuraDeTablasSobre(
  cliente: SupabaseClient<Database>,
): Omit<RepositorioDeTablas, 'publicar'> {
  return {
    crear: async ({ id, origenId, nombre, columnas }) =>
      resultadoDeCrear(
        await cliente.rpc('tabla_referencia_crear', {
          p_id: id,
          // Una compartida va sin origen: la RPC lo recibe nulo.
          p_origen: origenId as string,
          p_nombre: nombre,
          p_columnas: columnas as Json,
        }),
      ),
    cambiarColumnas: async ({ tablaId, columnas, versionEsperada }) =>
      resultadoDeColumnas(
        await cliente.rpc('tabla_referencia_columnas', {
          p_tabla: tablaId,
          p_columnas: columnas as Json,
          p_version_esperada: versionEsperada,
        }),
      ),
    desactivar: async ({ tablaId, versionEsperada }) =>
      resultadoDeDesactivar(
        await cliente.rpc('tabla_referencia_desactivar', {
          p_tabla: tablaId,
          p_version_esperada: versionEsperada,
        }),
      ),
  }
}
