// Las lecturas y las escrituras de las fórmulas del origen con el cliente de la sesión del servidor, uno por pedido.
import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeFormulasDelOrigen } from '../../entities/formulas-del-origen/repositorio'
import { leerLaFormulaDelOrigenSobre } from './formula'
import { leerFormulasDelOrigenSobre } from './lista'
import { formulasDelOrigenSobre } from './rpc'

export const getFormulasDelOrigen = async (origenId: string) =>
  leerFormulasDelOrigenSobre(await createClient(), origenId)

export const getLaFormulaDelOrigen = async (origenId: string, id: string) =>
  leerLaFormulaDelOrigenSobre(await createClient(), origenId, id)

export const formulasDelOrigenSupabase: RepositorioDeFormulasDelOrigen = {
  crear: async (pedido) => formulasDelOrigenSobre(await createClient()).crear(pedido),
  renombrar: async (pedido) => formulasDelOrigenSobre(await createClient()).renombrar(pedido),
  archivar: async (pedido) => formulasDelOrigenSobre(await createClient()).archivar(pedido),
  eliminar: async (pedido) => formulasDelOrigenSobre(await createClient()).eliminar(pedido),
  activar: async (pedido) => formulasDelOrigenSobre(await createClient()).activar(pedido),
}
