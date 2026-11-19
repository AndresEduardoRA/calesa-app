import 'server-only'
import { argumentosDeCrearEnPar, argumentosDeGuardarEnPar } from '../entities/pedido-en-par'
import type {
  CotizadorEncimaEnPar,
  CreadorEnPar,
  GuardadorEnPar,
} from '../entities/repositorios-de-hoja'
import { resultadoDeEncima } from '../entities/resultado-de-encima'
import { resultadoDeCrearEnPar, resultadoDeGuardarEnPar } from '../entities/resultado-en-par'
import { createClient } from '@/shared/lib/supabase/server'

// Crear las dos hermanas: UNA llamada a `cotizacion_crear_en_par()` con la sesión de quien cotiza (los mismos pasos que `cotizacion_crear`, una vez por opción, en una
// transacción). Lo que trae `code` es un rechazo, lo que no, una respuesta perdida.
export const crearCotizacionesEnPar: CreadorEnPar = async (pedido) => {
  const supabase = await createClient()
  return resultadoDeCrearEnPar(
    await supabase.rpc('cotizacion_crear_en_par', argumentosDeCrearEnPar(pedido)),
  )
}

// Guardar las dos hermanas: UNA llamada a `cotizacion_guardar_en_par()`. Si una cambió, PT409 con su id: el aviso la nombra por su opción.
export const guardarCotizacionesEnPar: GuardadorEnPar = async (pedido, etiquetas) => {
  const supabase = await createClient()
  return resultadoDeGuardarEnPar(
    await supabase.rpc('cotizacion_guardar_en_par', argumentosDeGuardarEnPar(pedido)),
    { ids: pedido.ids, etiquetas, cambiaElVehiculo: pedido.cambiaElVehiculo },
  )
}

// Cotizar encima del par: UNA llamada a `cotizacion_encima_en_par()`; vuelve como creada la nueva de la que se abrió.
export const cotizarEncimaEnPar: CotizadorEncimaEnPar = async ({ anteriores, intentos, cual }) => {
  const supabase = await createClient()
  const respuesta = await supabase.rpc('cotizacion_encima_en_par', {
    p_ids: [...intentos],
    p_anteriores: [...anteriores],
  })
  if (respuesta.error) return resultadoDeEncima(respuesta)
  const data = respuesta.data as { cotizaciones?: unknown[] } | null
  return resultadoDeEncima({ data: data?.cotizaciones?.[cual] ?? null, error: null })
}
