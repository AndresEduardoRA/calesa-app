// La «acción del requisito» (`docs/GLOSARIO.md`): lo que destraba un requisito que falta en «Qué falta», como dato. La regla de cada tipo la resuelve
// `resolverAccionesDeQueFalta()` en el servidor; el navegador sólo la filtra (`accionesADibujar()`) y la ejecuta. Aquí, los tipos y cómo se arma cada
// una (verbo corto a la vista, el objeto en el nombre accesible) y el resultado de un requisito a partir de su plan. Puro, sin I/O.
import type { HuecoDeAccion } from './capacidades-de-que-falta'
import {
  esClaveQueSePide,
  PEDIDO_A_ADMIN,
  tituloDelPedido,
  type ClaveQueSePide,
} from './pedido-de-requisito'

/** Un requisito de la fase de destino tal como lo arma la action (sin el tipo de `flujos`: una entidad no importa otro módulo). */
export type RequisitoQueFalta = {
  requisitoId: string
  tipo: 'documento' | 'dato' | 'espera'
  cumplido: boolean
  bloqueante: boolean
  detalle: Record<string, unknown>
  // «BL», «Contenedor», «Esperar a «Embarcado»» (`etiquetaDeRequisito`).
  etiqueta: string
  // «BL aprobado», «Contenedor» (`faltaDeRequisito`): lo que dice el título de la tarea de «Pedirlo».
  falta: string
}

type Rotulo = {
  // Lo que se ve: sólo el verbo, para no agrandar la tarjeta.
  etiqueta: string
  // El nombre accesible: el verbo con el objeto («Subir «BL»»).
  nombre: string
}

export type AccionDeRequisito = Rotulo &
  (
    | { tipo: 'subir'; tipoDocumentoId: string }
    | { tipo: 'revisar'; tipoDocumentoId: string }
    | { tipo: 'hueco'; hueco: HuecoDeAccion; enfocar: string | null }
    | { tipo: 'registrar-pago' }
    | { tipo: 'ir'; ruta: string }
    | { tipo: 'proyecto'; pestana: 'pagos' | null }
    | { tipo: 'pedir'; clave: ClaveQueSePide; titulo: string }
  )

export type AccionesDelRequisito = {
  principal: AccionDeRequisito | null
  // Hasta dos más, en el «⋯» del requisito.
  mas: AccionDeRequisito[]
  // «Pídeselo a quien administra los roles.»: en la línea sin principal; con principal, como nota del «⋯».
  pedido: string | null
  // El hueco donde se cumple (para saber si su regla está apagada) y si quien mira tiene su clave.
  hueco: HuecoDeAccion | null
  veElHueco: boolean
}

/** Lo que el «⋯» de un requisito ofrece como mucho. */
export const MAXIMO_EN_MAS = 2

export const SIN_ACCIONES: AccionesDelRequisito = {
  principal: null,
  mas: [],
  pedido: null,
  hueco: null,
  veElHueco: false,
}

const TITULO_DEL_HUECO: Record<HuecoDeAccion, string> = {
  documentos: 'Documentos',
  transporte: 'Transporte',
  aduana: 'Aduana',
  pagos: 'Pagos',
  repuestos: 'Repuestos',
}

export const subir = (etiqueta: string, tipoDocumentoId: string): AccionDeRequisito => ({
  tipo: 'subir',
  tipoDocumentoId,
  etiqueta: 'Subir',
  nombre: `Subir «${etiqueta}»`,
})

export const revisar = (etiqueta: string, tipoDocumentoId: string): AccionDeRequisito => ({
  tipo: 'revisar',
  tipoDocumentoId,
  etiqueta: 'Revisar',
  nombre: `Revisar «${etiqueta}»`,
})

/** «Ir a Documentos» o, con un campo que enfocar, «Completar». */
export function alHueco(
  hueco: HuecoDeAccion,
  etiqueta: string,
  enfocar: string | null = null,
): AccionDeRequisito {
  const verbo = enfocar ? 'Completar' : `Ir a ${TITULO_DEL_HUECO[hueco]}`
  return {
    tipo: 'hueco',
    hueco,
    enfocar,
    etiqueta: verbo,
    nombre: enfocar ? `Completar «${etiqueta}»` : `${verbo} por «${etiqueta}»`,
  }
}

export const registrarPago = (etiqueta: string): AccionDeRequisito => ({
  tipo: 'registrar-pago',
  etiqueta: 'Registrar',
  nombre: `Registrar un pago por «${etiqueta}»`,
})

/** Lleva a otra pantalla: el nombre lo arma quien llama (`Completar «VIN del vehículo»`). */
export const ir = (verbo: string, nombre: string, ruta: string): AccionDeRequisito => ({
  tipo: 'ir',
  ruta,
  etiqueta: verbo,
  nombre,
})

export const alProyecto = (etiqueta: string, pestana: 'pagos' | null): AccionDeRequisito => ({
  tipo: 'proyecto',
  pestana,
  etiqueta: 'Ir al proyecto',
  nombre: `Ir al proyecto por «${etiqueta}»`,
})

const pedir = (r: RequisitoQueFalta, clave: ClaveQueSePide, fase: string): AccionDeRequisito => ({
  tipo: 'pedir',
  clave,
  titulo: tituloDelPedido(r.falta, fase),
  etiqueta: 'Pedirlo',
  nombre: `Pedirlo: «${r.etiqueta}»`,
})

/**
 * Lo que un tipo de requisito propone, ya filtrado por permiso: `hacer` (quien mira puede destrabarlo), si no `pedir` (la clave de quien sí puede) y los
 * `extras` del «⋯» que quien mira sí puede abrir, en orden.
 */
export type PlanDelRequisito = {
  hacer: AccionDeRequisito | null
  pedir: string | null
  extras: readonly (AccionDeRequisito | null | false)[]
  hueco: HuecoDeAccion | null
}

export type ContextoDelPlan = {
  fase: string
  // «Pedirlo» sólo en un vehículo (una tarea no se vincula a un ítem) y con `agenda.tareas.asignar`.
  puedePedir: boolean
  veHueco: Record<HuecoDeAccion, boolean>
}

// Dos acciones que llevan al mismo lugar: el «⋯» no repite el destino de la principal.
function destino(a: AccionDeRequisito): string {
  if (a.tipo === 'hueco' || a.tipo === 'revisar')
    return `hueco:${a.tipo === 'hueco' ? a.hueco : 'documentos'}`
  if (a.tipo === 'ir') return `ir:${a.ruta}`
  if (a.tipo === 'subir') return `subir:${a.tipoDocumentoId}`
  return a.tipo
}

/** Del plan al resultado: la principal (hacer, pedir o la primera de las demás), hasta dos en el «⋯» sin repetir destino y el pedido a administración. */
export function armarAcciones(
  r: RequisitoQueFalta,
  plan: PlanDelRequisito,
  { fase, puedePedir, veHueco }: ContextoDelPlan,
): AccionesDelRequisito {
  const extras = plan.extras.filter((a): a is AccionDeRequisito => Boolean(a))
  const sePide = plan.hacer === null && plan.pedir !== null
  const pedirla =
    sePide && puedePedir && plan.pedir !== null && esClaveQueSePide(plan.pedir)
      ? pedir(r, plan.pedir, fase)
      : null
  const lista = [plan.hacer ?? pedirla, ...extras].filter((a): a is AccionDeRequisito => Boolean(a))
  const [principal = null, ...resto] = lista
  const mas = principal
    ? resto.filter((a) => destino(a) !== destino(principal)).slice(0, MAXIMO_EN_MAS)
    : []
  return {
    principal,
    mas,
    pedido: sePide && pedirla === null ? PEDIDO_A_ADMIN : null,
    hueco: plan.hueco,
    veElHueco: plan.hueco ? veHueco[plan.hueco] : false,
  }
}
