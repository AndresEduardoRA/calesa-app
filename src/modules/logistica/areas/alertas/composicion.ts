// Composición de el área `alertas` de `logistica` en el servidor: la lectura de la bandeja de Inicio (6.12-2) y la de los grupos de la bandeja del día de `/logistica`, con los vehículos
// nombrados por el campo principal de su origen (núcleo). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import type { LecturaDelGrupo } from '../../entities/alertas/grupo-leido'
import { nombrarVehiculos } from '../../features/nucleo/identidad-de-vehiculos'
import { leerGrupoDeLaBase, type PedidoDeUnGrupo } from '../../infra/alertas/grupo'
import { leerBandejaDeLaBase } from '../../infra/alertas/bandeja'
import { leerAtributosDeLaBase } from '../../infra/nucleo/atributos'

/** Demoradas, trabados y por aprobar que ve quien mira, `tope` filas por lista; una sola lectura por request. */
export const bandejaLogistica = leerBandejaDeLaBase

// Un grupo de la bandeja del día, con las filas nombradas. Los orígenes se nombran de a uno (el campo principal es de cada origen): son pocos y se leen en paralelo.
export async function leerGrupoDeLaBandeja(
  pedido: PedidoDeUnGrupo,
): Promise<Resultado<LecturaDelGrupo>> {
  const leida = await leerGrupoDeLaBase(pedido)
  if (!leida.ok) return leida
  const origenes = [...new Set(leida.data.filas.map((f) => f.origenId))]
  const nombres = new Map<string, string>()
  await Promise.all(
    origenes.map(async (origenId) => {
      const deEste = leida.data.filas.filter((f) => f.origenId === origenId)
      const nombradas = await nombrarVehiculos(
        origenId,
        deEste.map((f) => ({ id: f.vehiculoId, titulo: f.titulo })),
        leerAtributosDeLaBase,
      )
      for (const n of nombradas) nombres.set(`${origenId}|${n.id}`, n.nombre)
    }),
  )
  return {
    ok: true,
    data: {
      ...leida.data,
      filas: leida.data.filas.map((f) => ({
        ...f,
        nombre: nombres.get(`${f.origenId}|${f.vehiculoId}`) ?? f.titulo,
      })),
    },
  }
}
