import { CalculatorIcon, Trash2Icon } from 'lucide-react'
import type { AccionDelAviso, AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  ACCION_PRINCIPAL_DEL_VEHICULO,
  etiquetaDeAccionDeVehiculo,
  type ClaveDeAccionDeVehiculo,
} from '../../../entities/acciones-de-vehiculo'
import type { OfertasConMotivo } from '../../../entities/ofertas-del-menu-de-vehiculo'
import type { PermisoDePapelera } from '../../../entities/papelera-permiso'

// Lo que hace cada línea del «⋯» en la superficie que lo dibuja (la fila, la tarjeta o la ficha). La lista y su orden son los de
// `entities/acciones-de-vehiculo.ts`; cuándo se ofrece cada una, `ofertas-del-menu-de-vehiculo.ts`.
export type Lineas = {
  ofertas: OfertasConMotivo
  publicado: boolean
  papelera: PermisoDePapelera
  enviando: boolean
  cotizar: () => void
  editar: () => void
  imagenes: () => void
  fechas: () => void
  publicar: () => void
  actualizar: () => void
  verActividad: () => void
  enviarAPapelera: () => void
  // Ir a donde destraba la papelera apagada (las acciones de su aviso que navegan).
  ir: (ruta: string) => void
}

type Constructor = (p: Lineas) => AccionDeMenu[]

// La línea de una acción, apagada si la oferta lo dice y con su motivo debajo.
function lineaDe(
  clave: ClaveDeAccionDeVehiculo,
  p: Lineas,
  alElegir: () => void,
  extra: Partial<Extract<AccionDeMenu, { tipo: 'accion' }>> = {},
): AccionDeMenu[] {
  const { oferta, motivo } = p.ofertas[clave]
  return [
    {
      tipo: 'accion',
      clave,
      etiqueta: etiquetaDeAccionDeVehiculo(clave, { publicado: p.publicado }),
      deshabilitada: oferta === 'apagada',
      alElegir,
      ...extra,
    },
    ...(oferta === 'apagada' && motivo !== null
      ? [{ tipo: 'nota' as const, clave: `motivo-${clave}`, texto: motivo }]
      : []),
  ]
}

// Del «⋯» sólo se ofrece lo que navega: ninguna acción de un bloqueo es otra cosa.
const esNavegacion = (accion: AccionDelAviso): accion is Extract<AccionDelAviso, { tipo: 'ir' }> =>
  accion.tipo === 'ir'

// Bajo el motivo de la papelera apagada: lo que se puede hacer ahí mismo (una línea por acción, la principal primero) y, si falta el permiso para
// lo que destraba, el pedido como otra nota.
function lineasDeSalida(papelera: PermisoDePapelera, ir: (ruta: string) => void): AccionDeMenu[] {
  if (papelera.estado !== 'deshabilitado') {
    return []
  }
  const { acciones, pedido }: AccionesDeUnAviso = papelera.acciones
  return [
    ...acciones.filter(esNavegacion).map((accion, indice): AccionDeMenu => ({
      tipo: 'accion',
      clave: `salida-${String(indice)}`,
      etiqueta: accion.etiqueta,
      despuesDeCerrar: true,
      alElegir: () => {
        ir(accion.ruta)
      },
    })),
    ...(pedido === null
      ? []
      : [{ tipo: 'nota' as const, clave: 'pedido-papelera', texto: pedido }]),
  ]
}

const LINEAS: Readonly<Record<ClaveDeAccionDeVehiculo, Constructor>> = {
  cotizar: (p) =>
    lineaDe('cotizar', p, p.cotizar, {
      icono: <CalculatorIcon aria-hidden />,
      principal: ACCION_PRINCIPAL_DEL_VEHICULO === 'cotizar',
    }),
  // Las que abren un panel esperan a que el menú se cierre (el foco vuelve al «⋯» antes de abrir).
  editar: (p) => lineaDe('editar', p, p.editar, { despuesDeCerrar: true }),
  imagenes: (p) => lineaDe('imagenes', p, p.imagenes, { despuesDeCerrar: true }),
  fechas: (p) => lineaDe('fechas', p, p.fechas, { despuesDeCerrar: true }),
  publicar: (p) => lineaDe('publicar', p, p.publicar, { despuesDeCerrar: true }),
  actualizar: (p) => lineaDe('actualizar', p, p.actualizar, { despuesDeCerrar: true }),
  actividad: (p) => lineaDe('actividad', p, p.verActividad),
  papelera: (p) => [
    ...lineaDe('papelera', p, p.enviarAPapelera, {
      icono: <Trash2Icon aria-hidden />,
      destructiva: true,
      deshabilitada: p.enviando || p.ofertas.papelera.oferta === 'apagada',
    }),
    ...lineasDeSalida(p.papelera, p.ir),
  ],
}

// Las líneas de los bloques que se ofrecen, con un separador entre bloques.
export function lineasDelMenu(
  bloques: readonly (readonly ClaveDeAccionDeVehiculo[])[],
  p: Lineas,
): AccionDeMenu[] {
  return bloques.flatMap((bloque, indice) => [
    ...(indice > 0 ? [{ tipo: 'separador' as const, clave: `separador-${String(indice)}` }] : []),
    ...bloque.flatMap((clave) => LINEAS[clave](p)),
  ])
}
