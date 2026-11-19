import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { PedidoDeAplicar } from '../../entities/plantillas-de-v1/pedido'
import { aplicarPlantillaDeV1, leerEstadoParaPlantillasDeV1 } from './plantillas-de-v1'

// Lo de las plantillas de V1 con el cliente de la sesión, uno por pedido: la base vuelve a pedir `cotizaciones.configurar` del origen.
export const plantillasDeV1Supabase = {
  leerEstado: async (origenId: string) =>
    leerEstadoParaPlantillasDeV1(await createClient(), origenId),
  aplicar: async (pedido: PedidoDeAplicar) => aplicarPlantillaDeV1(await createClient(), pedido),
}
