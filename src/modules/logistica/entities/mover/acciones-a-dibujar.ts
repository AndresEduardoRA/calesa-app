// Lo que el navegador hace con las acciones ya resueltas de un requisito antes de dibujarlas: lo que sólo se sabe por el DOM y el lugar. Si quien mira tiene
// la clave del hueco y el hueco no está, su regla está apagada: nada (tampoco «Pedirlo»). Lo que lleva a un hueco ausente se descarta; en un drawer, lo que
// sacaría de la pantalla lleva a la página de la unidad; «Ir al proyecto» arma su ruta con el proyecto del ítem. Sin red, todo se dibuja apagado. Puro.
import { RUTAS } from '@/shared/lib/rutas'
import { rutaDeLaUnidad } from '../nucleo/enlaces'
import {
  MAXIMO_EN_MAS,
  type AccionDeRequisito,
  type AccionesDelRequisito,
} from './accion-de-requisito'
import type { HuecoDeAccion } from './capacidades-de-que-falta'

/** Una acción lista para dibujar: «Ir al proyecto» ya es un enlace con su ruta. */
export type AccionADibujar = Exclude<AccionDeRequisito, { tipo: 'proyecto' }>

export type AccionesADibujar = {
  principal: AccionADibujar | null
  mas: AccionADibujar[]
  pedido: string | null
  // Sin red: todo se ve, apagado, con «Sin conexión».
  apagadas: boolean
}

export type LugarDeLasAcciones = {
  hayHueco: (hueco: HuecoDeAccion) => boolean
  // En la página de la unidad (no en un drawer).
  enLaPagina: boolean
  unidad: { tipo: 'vehiculo' | 'repuesto'; id: string; proyecto?: { id: string } | null }
  enLinea: boolean
}

export const NADA_QUE_DIBUJAR: AccionesADibujar = {
  principal: null,
  mas: [],
  pedido: null,
  apagadas: false,
}

export const ABRIR_LA_UNIDAD = 'Abrir la unidad'

function huecoDe(a: AccionDeRequisito): HuecoDeAccion | null {
  if (a.tipo === 'hueco') return a.hueco
  if (a.tipo === 'subir' || a.tipo === 'revisar') return 'documentos'
  if (a.tipo === 'registrar-pago') return 'pagos'
  return null
}

function ajustar(a: AccionDeRequisito, lugar: LugarDeLasAcciones): AccionADibujar | null {
  const hueco = huecoDe(a)
  if (hueco !== null && !lugar.hayHueco(hueco)) return null
  if (a.tipo === 'proyecto') {
    const proyecto = lugar.unidad.proyecto?.id
    if (!proyecto) return null
    const ruta = `${RUTAS.repuestos}/${encodeURIComponent(proyecto)}${a.pestana ? `?pestana=${a.pestana}` : ''}`
    return { tipo: 'ir', ruta, etiqueta: a.etiqueta, nombre: a.nombre }
  }
  if (a.tipo === 'ir' && !lugar.enLaPagina && lugar.unidad.tipo === 'vehiculo') {
    return {
      tipo: 'ir',
      ruta: rutaDeLaUnidad(lugar.unidad.id),
      etiqueta: ABRIR_LA_UNIDAD,
      nombre: `${ABRIR_LA_UNIDAD} por «${a.nombre}»`,
    }
  }
  return a
}

/** Las acciones de un requisito como se dibujan en este lugar. */
export function accionesADibujar(
  resueltas: AccionesDelRequisito | undefined,
  lugar: LugarDeLasAcciones,
): AccionesADibujar {
  if (resueltas === undefined) return NADA_QUE_DIBUJAR
  if (resueltas.hueco !== null && resueltas.veElHueco && !lugar.hayHueco(resueltas.hueco)) {
    return NADA_QUE_DIBUJAR
  }
  const lista = [resueltas.principal, ...resueltas.mas]
    .map((a) => (a ? ajustar(a, lugar) : null))
    .filter((a): a is AccionADibujar => a !== null)
  // Dos que terminan en «Abrir la unidad» son la misma.
  const sinRepetir = lista.filter(
    (a, i) => a.tipo !== 'ir' || lista.findIndex((b) => b.tipo === 'ir' && b.ruta === a.ruta) === i,
  )
  const [principal = null, ...mas] = sinRepetir
  return {
    principal,
    mas: mas.slice(0, MAXIMO_EN_MAS),
    pedido: resueltas.pedido,
    apagadas: !lugar.enLinea,
  }
}
