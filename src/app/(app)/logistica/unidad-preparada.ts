import { puede } from '@/modules/equipo'
import { leerFasesDeOrigen, leerFlujoDeOrigen } from '@/modules/flujos'
import {
  esHuecoConocido,
  leerUnidad,
  type HuecoDeLaUnidad,
  type UnidadAbierta,
} from '@/modules/logistica'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { HUECOS_DE_LA_UNIDAD, huecosDeLaUnidad } from './huecos-de-la-unidad'

export type UnidadPreparada =
  // No existe, está en la papelera o no se ve: se dicen igual (decir «no tienes permiso» confirmaría que existe).
  | { tipo: 'no_disponible' }
  | { tipo: 'sin_permiso' }
  | {
      tipo: 'lista'
      unidad: UnidadAbierta
      origen: string
      fase: { nombre: string; color: string } | null
      huecos: HuecoDeLaUnidad[]
      aviso: string | null
    }

// Todo lo que pide dibujar la unidad con ese id, para quien mira: la unidad bajo la RLS de `vehiculos`, `logistica.ver` en su origen, el origen, la fase y los huecos que se dibujan (permisos y reglas del flujo).
// La comparten la página de la unidad y el drawer de gastos. Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar»; el del flujo del origen no tumba nada: deja apagados los huecos que
// piden una regla y lo dice (`aviso`). `huecoAbierto` (`?hueco=`) deja ese hueco abierto desde el principio en los bloques; una clave desconocida se ignora.
export async function prepararUnidad(
  id: string,
  permisos: Permisos,
  huecoAbierto?: string,
): Promise<UnidadPreparada> {
  const unidad = datosO(await leerUnidad(id))
  if (!unidad) return { tipo: 'no_disponible' }
  if (!puede(permisos, 'logistica.ver', unidad.origenId)) return { tipo: 'sin_permiso' }
  const [origenes, fases, flujo] = await Promise.all([
    getOrigenes(true),
    leerFasesDeOrigen(unidad.origenId),
    leerFlujoDeOrigen(unidad.origenId),
  ])
  const origen = datosO(origenes).find((uno) => uno.id === unidad.origenId)
  const fase = datosO(fases).find((una) => una.id === unidad.faseId) ?? null
  const { huecos, aviso } = huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, { unidad, permisos, flujo })
  return {
    tipo: 'lista',
    unidad,
    origen: origen?.nombre ?? '',
    fase,
    huecos: esHuecoConocido(huecoAbierto)
      ? huecos.map((hueco) =>
          hueco.clave === huecoAbierto ? { ...hueco, abiertoAlInicio: true } : hueco,
        )
      : huecos,
    aviso,
  }
}
