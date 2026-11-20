import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { PedidoDeAplicar } from '../../entities/plantillas-de-v1/pedido'
import { leerFormulaDeTrabajoSobre } from '../queries/formula-de-trabajo'
import { aplicarPlantillaDeV1, leerEstadoParaPlantillasDeV1 } from './plantillas-de-v1'

// Lo de las plantillas de V1 con el cliente de la sesión, uno por pedido: la base vuelve a pedir `cotizaciones.configurar` del origen. El estado es el de la
// fórmula de trabajo, la que escribe el paquete.
export const plantillasDeV1Supabase = {
  leerEstado: async (origenId: string) => {
    const cliente = await createClient()
    const deTrabajo = await leerFormulaDeTrabajoSobre(cliente, origenId)
    if (!deTrabajo.ok) return deTrabajo
    return leerEstadoParaPlantillasDeV1(cliente, deTrabajo.data?.id ?? null)
  },
  aplicar: async (pedido: PedidoDeAplicar) => aplicarPlantillaDeV1(await createClient(), pedido),
}
