// La actividad desde el navegador, con la sesión de quien mira: «Ver más», «Ir a una fecha», al abrir un cambio, su diff, y la «Actividad reciente»
// de una ficha al acercarse.
import { createClient } from '@/shared/lib/supabase/browser'
import type { PedidoDeActividad } from '../entities/filtros'
import { leerCampos, leerPagina, leerReciente, leerUnDiff, type PedidoDeCampos } from './consultas'

export function leerPaginaDeActividad(pedido: PedidoDeActividad) {
  return leerPagina(createClient(), pedido)
}

export function leerDiff(id: number) {
  return leerUnDiff(createClient(), id)
}

export function leerCamposDeAtributos(pedido: PedidoDeCampos) {
  return leerCampos(createClient(), pedido)
}

export function leerActividadReciente(tabla: string, registro: string) {
  return leerReciente(createClient(), tabla, registro)
}
