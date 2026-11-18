import 'server-only'
import { z } from 'zod'
import { inicialDe } from '../../entities/apertura'
import { entradasDeLoGuardado } from '../../entities/entradas-de-lo-guardado'
import { entradasDelPedido, indiceDeHoja } from '../../entities/entradas'
import { hojaDeUnaGuardadaDesde } from '../../entities/hoja-de-una-guardada-lectura'
import { argumentosDeEvaluar, resultadoDeEvaluar } from '../../entities/pedido-de-recalculo'
import type { LectorDeUnaGuardada } from '../../entities/repositorios-de-hoja'
import { vehiculoParaCalcular } from '../../entities/vehiculo-de-la-guardada'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

// Lo que abre una cotización guardada: UNA llamada a `cotizacion_hoja_guardada()` (la fila y el snapshot recortados, el diseño de SU versión, quién la guarda) y, con la hoja leída,
// UNA a `cotizacion_evaluar(p_cotizacion)` con lo guardado como entradas: el primer cálculo llega con la página, como en la hoja nueva. Dos pedidos en serie (el segundo necesita
// las entradas que salen del primero); nada de lista ni de cursor. `docs/RENDIMIENTO.md` › «Cotizador (fórmula, diseño, cotizaciones)». Con un vehículo para cambiarlo (T315) la
// evaluación lleva `p_vehiculo`; una tercera llamada sólo si la base lo rechaza (42501 o una regla), sin él, como `recalcularAlAbrir`.
const esquemaId = z.guid()

export const getHojaDeUnaGuardada: LectorDeUnaGuardada = async (id, opciones) => {
  const cotizacion = esquemaId.safeParse(id)
  if (!cotizacion.success) {
    return fallo('validacion', 'Esa cotización no es válida.')
  }
  const supabase = await createClient()
  const leida = await supabase.rpc('cotizacion_hoja_guardada', { p_id: cotizacion.data })
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  const hoja = hojaDeUnaGuardadaDesde(leida.data)
  if (!hoja) {
    return fallo('inesperado', 'No pudimos leer la cotización. Recarga para volver a intentar.')
  }
  const indice = indiceDeHoja(hoja.diseno.secciones, hoja.diseno.cabecera.modos)
  const entradas = entradasDeLoGuardado(indice, hoja.guardado, hoja.cotizacion)
  const evaluar = async (vehiculoId: string | null) =>
    resultadoDeEvaluar(
      await supabase.rpc(
        'cotizacion_evaluar',
        argumentosDeEvaluar({
          de: { tipo: 'guardada', cotizacionId: hoja.cotizacion.id, vehiculoId },
          entradas: entradasDelPedido(entradas),
          modoTc: entradas.modoTc,
        }),
      ),
    )
  const candidato = vehiculoParaCalcular(
    hoja.cotizacion,
    hoja.puedeGuardar,
    opciones?.vehiculo ?? null,
  )
  const recalculo = await evaluar(candidato)
  const rechazado =
    !recalculo.ok &&
    (recalculo.error.codigo === 'sin_permiso' || recalculo.error.codigo === 'regla')
  if (candidato === null || !rechazado) {
    return ok({
      hoja,
      inicial: inicialDe(hoja.diseno, recalculo),
      vehiculoNuevo: candidato,
      vehiculoSoltado: false,
    })
  }
  const conElSuyo = await evaluar(null)
  return ok({
    hoja,
    inicial: inicialDe(hoja.diseno, conElSuyo),
    vehiculoNuevo: null,
    vehiculoSoltado: true,
  })
}
