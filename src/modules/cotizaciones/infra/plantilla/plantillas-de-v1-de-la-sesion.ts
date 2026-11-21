import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { PedidoDeAplicar } from '../../entities/plantillas-de-v1/pedido'
import { aplicarPlantillaDeV1, leerEstadoParaPlantillasDeV1 } from './plantillas-de-v1'

// Lo de las plantillas de V1 con el cliente de la sesión, uno por pedido: la base vuelve a pedir `cotizaciones.configurar` del origen. El estado es el de la
// fórmula del origen que se edita (la de la URL), la que escribe el paquete; la RLS recorta lo que no ve.
export const plantillasDeV1Supabase = {
  leerEstado: async (formulaDelOrigenId: string) =>
    leerEstadoParaPlantillasDeV1(await createClient(), formulaDelOrigenId),
  aplicar: async (pedido: PedidoDeAplicar) => aplicarPlantillaDeV1(await createClient(), pedido),
}
