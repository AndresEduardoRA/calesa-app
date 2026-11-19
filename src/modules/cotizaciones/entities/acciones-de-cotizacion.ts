// El «⋯» de una cotización, dicho una sola vez: qué acciones tiene, en qué orden y cuáles se ven. Lo dibujan el de la fila del listado y el de la tarjeta del celular
// (`src/app/(app)/cotizaciones/menu-de-la-fila.tsx`) y el de la cabecera de la guardada (`features/hoja/components/menu-de-la-guardada/`); ninguno escribe el suyo. Es la de los
// vehículos (`vehiculos/entities/acciones-de-vehiculo.ts`) con lo que existe de una cotización: compartir primero, lo que se mira, lo que se hace seguido, lo que se marca, moderar y,
// separado al final, lo destructivo. Cada acción llama a las **mismas** actions y RPC; lo que quien mira no puede hacer no aparece (cada área dice quién: `puedeAprobar`,
// `puedeMarcarLaFinal`, `puedeModerarLaCotizacion`…). Es del núcleo: lo usan la cabecera (núcleo), las áreas que le suman líneas y el listado.

export type ClaveDeAccionDeCotizacion =
  | 'compartir'
  | 'vista-previa'
  | 'pdf'
  | 'revisiones'
  | 'aprobar'
  | 'final'
  | 'comprobante'
  | 'encima'
  | 'favorita'
  | 'reportar'
  | 'invalidar'
  | 'descartar'
  | 'reactivar'
  | 'papelera'

// El texto de cada una. Las que abren algo encima para confirmar o escribir (un diálogo) llevan «…»; las que muestran algo (la vista previa, las revisiones) o lo hacen
// (bajar el PDF, cotizar encima) no. «Favorita» es una casilla. «Reportar…» pasa a decir que ya se reportó (el modal trae el motivo escrito).
export const ETIQUETA_DE_ACCION_DE_COTIZACION: Readonly<Record<ClaveDeAccionDeCotizacion, string>> =
  {
    compartir: 'Compartir cotización…',
    'vista-previa': 'Vista previa',
    pdf: 'Descargar PDF',
    revisiones: 'Revisiones',
    aprobar: 'Aprobar',
    final: 'Marcar final…',
    comprobante: 'Emitir comprobante…',
    encima: 'Cotizar encima',
    favorita: 'Favorita',
    reportar: 'Reportar…',
    invalidar: 'Invalidar…',
    descartar: 'Descartar los reportes…',
    reactivar: 'Reactivar…',
    papelera: 'Enviar a la papelera',
  }

export const ETIQUETA_DE_REPORTAR_SI_YA_REPORTO = 'Reportaste esta cotización…'

// El orden, en bloques: compartir primero y solo (lo que más se hace con una cotización: mandársela al cliente), lo que se mira (vista previa, PDF, revisiones), lo que se hace
// seguido (aprobar, marcar final, emitir el comprobante, cotizar encima), lo que se marca (favorita y reportar), moderar (invalidar, descartar los reportes o reactivar: la base
// ofrece una u otras) y lo destructivo al final y separado (la papelera). Entre dos bloques con algo va un separador. El listado no ofrece las que sólo tiene el detalle.
export const BLOQUES_DEL_MENU_DE_COTIZACION: readonly (readonly ClaveDeAccionDeCotizacion[])[] = [
  ['compartir'],
  ['vista-previa', 'pdf', 'revisiones'],
  ['aprobar', 'final', 'comprobante', 'encima'],
  ['favorita', 'reportar'],
  ['invalidar', 'descartar', 'reactivar'],
  ['papelera'],
]

// Lo que el detalle deja a la vista en su cabecera y no repite en el «⋯» (`docs/UX.md` › «Cotización guardada»): «Compartir» y «Aprobar» (o la insignia «Aprobada»).
export const A_LA_VISTA_EN_LA_GUARDADA: readonly ClaveDeAccionDeCotizacion[] = [
  'compartir',
  'aprobar',
]

// Qué ofrece cada acción a esta persona sobre esta cotización: una clave presente es una acción que se ve (un `motivo` la deja apagada y lo dice debajo: falta el vehículo,
// es inválida…); una ausente no existe para ella. Cruza del servidor al navegador, sin los permisos.
export type OfertasDelMenuDeCotizacion = Readonly<
  Partial<Record<ClaveDeAccionDeCotizacion, { motivo: string | null }>>
>

// Las acciones que se ofrecen, por bloques y en su orden (sin bloques vacíos). `aLaVista`: las que esa superficie ya muestra fuera del «⋯».
export function accionesDeCotizacion(
  ofertas: Readonly<Partial<Record<ClaveDeAccionDeCotizacion, unknown>>>,
  { aLaVista = [] }: { aLaVista?: readonly ClaveDeAccionDeCotizacion[] } = {},
): ClaveDeAccionDeCotizacion[][] {
  return BLOQUES_DEL_MENU_DE_COTIZACION.map((bloque) =>
    bloque.filter((clave) => ofertas[clave] !== undefined && !aLaVista.includes(clave)),
  ).filter((bloque) => bloque.length > 0)
}
