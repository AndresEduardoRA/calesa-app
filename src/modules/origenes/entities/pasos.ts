// «Para cotizar y mover»: lo que le falta a un origen, en cinco pasos con su estado. Se deriva de lo que hay (campos, fases, fórmula,
// tarjeta, integración), no de un «recién creado»: si alguien deshace algo, el paso vuelve a fallar. Una sola regla para la tira de la
// página del origen, la tarjeta de la lista y el inicio de Configuración.
import type { OrigenConUso } from './origen'

export const CLAVES_DE_PASO = ['datos', 'campos', 'flujo', 'formula', 'tarjeta'] as const

export type ClaveDePaso = (typeof CLAVES_DE_PASO)[number]

// `bloquea` (✗) sólo para lo que impide cotizar o mover; `aviso` (⚠), lo que se puede usar igual con lo de siempre.
export type EstadoDePaso = 'listo' | 'aviso' | 'bloquea'

export type PasoParaCotizar = {
  clave: ClaveDePaso
  titulo: string
  estado: EstadoDePaso
  // Una frase corta: «Listo» o qué pasa sin él.
  frase: string
}

// Un origen inactivo no recibe vehículos ni cotizaciones nuevos: no tiene pasos, sólo se dice «Inactivo».
export type ParaCotizarYMover = { inactivo: true } | { inactivo: false; pasos: PasoParaCotizar[] }

const TITULO: Record<ClaveDePaso, string> = {
  datos: 'Datos',
  campos: 'Campos',
  flujo: 'Flujo',
  formula: 'Fórmula',
  tarjeta: 'Tarjeta',
}

const LISTO = 'Listo'

// Lo que dice cada paso cuando no está listo.
export const FRASE_DEL_PASO: Record<ClaveDePaso, string> = {
  datos: 'Activa apibara para traer sus subastas',
  campos: 'Sin campos activos: la ficha muestra sólo lo básico',
  flujo: 'Sin fases: sus vehículos no se pueden mover',
  formula: 'Sin publicar: no se puede cotizar',
  tarjeta: 'Sin publicar: se usa la tarjeta de siempre',
}

function paso(clave: ClaveDePaso, falla: EstadoDePaso | null): PasoParaCotizar {
  return {
    clave,
    titulo: TITULO[clave],
    estado: falla ?? 'listo',
    frase: falla === null ? LISTO : FRASE_DEL_PASO[clave],
  }
}

export function pasosParaCotizarYMover(
  origen: OrigenConUso,
  contexto: { apibaraActiva: boolean },
): ParaCotizarYMover {
  if (!origen.activo) {
    return { inactivo: true }
  }
  const { uso } = origen
  return {
    inactivo: false,
    pasos: [
      paso('datos', origen.tipo === 'subasta' && !contexto.apibaraActiva ? 'aviso' : null),
      paso('campos', uso.camposActivos === 0 ? 'aviso' : null),
      paso('flujo', uso.fases === 0 ? 'bloquea' : null),
      paso('formula', uso.formulaPublicada ? null : 'bloquea'),
      paso('tarjeta', uso.tarjetaPublicada ? null : 'aviso'),
    ],
  }
}

// Los pasos que no están listos, en su orden (vacío si el origen está inactivo o no le falta nada).
export function pasosQueFaltan(
  origen: OrigenConUso,
  contexto: { apibaraActiva: boolean },
): PasoParaCotizar[] {
  const tira = pasosParaCotizarYMover(origen, contexto)
  return tira.inactivo ? [] : tira.pasos.filter((uno) => uno.estado !== 'listo')
}

const FALTA_EN_LA_TARJETA: Record<ClaveDePaso, string> = {
  datos: 'Falta activar apibara',
  campos: 'Sin campos activos',
  flujo: 'Sin fases',
  formula: 'Falta publicar la fórmula',
  tarjeta: 'Falta publicar la tarjeta',
}

// Lo que la tarjeta de un origen en la lista dice que le falta, en corto y en el orden de los pasos, con su estado (el ícono). Un origen
// inactivo no muestra faltas.
export function faltasDeLaTarjeta(
  origen: OrigenConUso,
  contexto: { apibaraActiva: boolean },
): { clave: ClaveDePaso; estado: EstadoDePaso; texto: string }[] {
  return pasosQueFaltan(origen, contexto).map((uno) => ({
    clave: uno.clave,
    estado: uno.estado,
    texto: FALTA_EN_LA_TARJETA[uno.clave],
  }))
}
