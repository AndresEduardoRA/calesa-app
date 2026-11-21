import 'server-only'
import { leerFormulaDeTrabajo } from '@/modules/cotizaciones'
import {
  enMarcha,
  estadoDeLaPuestaEnMarcha,
  pendienteEnLaTira,
  type ClaveDePaso,
  type OrigenConUso,
} from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { permisosDeLaPuestaEnMarcha } from './puesta-en-marcha/abrir'

export type PuestaEnMarchaEnLaTira = {
  pendiente: ClaveDePaso | null
  seguir: { ruta: string } | null
}

const SIN_PUESTA_EN_MARCHA: PuestaEnMarchaEnLaTira = { pendiente: null, seguir: null }

// Lo que «Para cotizar y mover» suma mientras el origen no tiene fórmula activa: el paso «Pendiente» y «Seguir la puesta en marcha» (a la raíz,
// que lleva al paso que toca). La fórmula de trabajo sólo se lee si hace falta: un origen inactivo o ya con fórmula activa no la pide, y sin el
// permiso del cotizador la RLS no la deja leer. Si esa lectura falla, la tira sigue como si no hubiera fórmula: sólo cambia qué paso dice «Pendiente».
export async function puestaEnMarchaEnLaTira(
  permisos: Permisos,
  origen: OrigenConUso,
): Promise<PuestaEnMarchaEnLaTira> {
  if (!origen.activo || origen.uso.formulaPublicada) {
    return SIN_PUESTA_EN_MARCHA
  }
  const losPermisos = permisosDeLaPuestaEnMarcha(permisos, origen.id)
  const formula = losPermisos.cotizador ? await leerFormulaDeTrabajo(origen.id) : null
  const estado = estadoDeLaPuestaEnMarcha({
    uso: origen.uso,
    hayFormulaDeTrabajo: formula !== null && formula.ok && formula.data !== null,
    permisos: losPermisos,
  })
  const pendiente = pendienteEnLaTira(estado)
  if (!enMarcha(estado) || pendiente === null) {
    return SIN_PUESTA_EN_MARCHA
  }
  return { pendiente, seguir: { ruta: rutaDeLaPuestaEnMarcha(origen.id) } }
}
