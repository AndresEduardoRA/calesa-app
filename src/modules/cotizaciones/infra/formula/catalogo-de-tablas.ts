import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { TablaDelCatalogo } from '../../entities/compilador'
import { leerCatalogoDeTablasSobre } from './consulta-del-catalogo-de-tablas'

// El catálogo de tablas del origen para BUSCARV, en el servidor, con la sesión de quien configura. Null si no se pudo leer.
export async function leerCatalogoDeTablas(origenId: string): Promise<TablaDelCatalogo[] | null> {
  return leerCatalogoDeTablasSobre(await createClient(), origenId)
}
