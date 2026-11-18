import { CalculatorIcon, CarFrontIcon, Trash2Icon } from 'lucide-react'
import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  ACCION_PRINCIPAL_DEL_LEAD,
  ETIQUETA_DE_ACCION_DE_LEAD,
  accionesDeLead,
  etiquetaDeAccionDeLead,
  type ClaveDeAccionDeLead,
  type EdicionDelMenu,
} from '../../../entities/acciones-de-lead'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import type { useEnvioAPapelera } from '../../papelera/hooks/use-envio-a-papelera'
import type { Marcas } from '../hooks/use-marcas'

// Las líneas del «⋯» de un lead (`<MenuDeLead>`): cada acción de la lista única con lo que hace en la superficie que la dibuja.
// Lo que cambia de una superficie a otra del «⋯» de un lead (la fila, la tarjeta de la lista, la tarjeta del kanban y la ficha): la lista y
// su orden son los mismos (`entities/acciones-de-lead.ts`); lo que cambia es qué pasa al elegir cada cosa.
export type PropsComunes = {
  leadId: string
  nombre: string
  etiquetas: Etiquetas
  alGestionar: () => void
  // Quien mira puede enviar este lead a la papelera.
  puedeEnviar: boolean
  // «Cotizar lead»: la hoja de cotizar con este lead elegido, en el primer origen donde quien mira cotiza (la arma `src/app`). Al elegirla
  // se le suma `returnTo` = donde se estaba. Sin esto (no cotiza en ningún origen), no se ofrece.
  paraCotizar?: string | null | undefined
  // Con el lead en la cartera y `leads.editar`: agendar un recordatorio, anotar un seguimiento y crear una oportunidad (abren su modal; qué
  // modal y dónde lo dice cada superficie). Sin esto, no se ofrecen.
  acciones?:
    { alAnotar: () => void; alAgendar: () => void; alNuevaOportunidad: () => void } | undefined
  // «Ver oportunidades»: con el lead en la cartera de quien mira, lleva a la sección «Oportunidades» de la ficha. Sin esto, no se ofrece.
  verOportunidades?: (() => void) | undefined
  // «Editar lead» (o «Editar teléfonos» con `modo: 'telefonos'`): abre el panel de edición (`?panel=editar-lead`, con `para` fuera de la
  // ficha). Sin esto, no se ofrece.
  editar?: { modo: EdicionDelMenu; alEditar: () => void } | undefined
  // Lo que la papelera hace distinto donde el lead no se queda en pantalla: `alEnviado` (la ficha lleva al listado),
  // y con un vehículo vinculado que quien mira ve, `motivo` la apaga y `alIrAVehiculos` ofrece ir a «Vehículos».
  papelera?: { alEnviado?: () => void; motivo?: string | null; alIrAVehiculos?: () => void }
  // Después de cambiar una marca: quien dibuja el menú puede volver a leer el lead.
  alMarcar?: () => void
  // «Ver actividad»: `/actividad` de este lead, sólo con `actividad.ver` (la arma `src/app`). Sin esto, no se ofrece.
  paraActividad?: string | null | undefined
  // En una cabecera (la de la ficha): con borde, como los botones de al lado.
  conBorde?: boolean
  // El kanban no trae las marcas ni la cartera del lead: se leen al abrir el menú (`alAbrir`) y mientras tanto, o si no llegan, el menú
  // lo dice (`carga`).
  alAbrir?: () => void
  carga?: { cargando: boolean; aviso: string | null }
}

export type Lineas = {
  marcas: Marcas
  envio: ReturnType<typeof useEnvioAPapelera>
  abrirEtiquetas: () => void
  // Ir a otra página: «Cotizar lead» (con `returnTo`) y «Ver actividad».
  cotizar: (() => void) | undefined
  verActividad: (() => void) | undefined
} & Pick<
  PropsComunes,
  'leadId' | 'acciones' | 'papelera' | 'alMarcar' | 'carga' | 'verOportunidades' | 'editar'
>

const sinAccion = () => undefined

type Constructor = (p: Lineas) => AccionDeMenu[]

// Cada acción de la lista, con lo que hace en esta superficie.
const LINEAS: Readonly<Record<ClaveDeAccionDeLead, Constructor>> = {
  cotizar: (p) => [
    {
      tipo: 'accion',
      clave: 'cotizar',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.cotizar,
      icono: <CalculatorIcon aria-hidden />,
      principal: ACCION_PRINCIPAL_DEL_LEAD === 'cotizar',
      alElegir: p.cotizar ?? sinAccion,
    },
  ],
  agendar: (p) => [
    {
      tipo: 'accion',
      clave: 'agendar',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.agendar,
      despuesDeCerrar: true,
      alElegir: p.acciones?.alAgendar ?? sinAccion,
    },
  ],
  anotar: (p) => [
    {
      tipo: 'accion',
      clave: 'anotar',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.anotar,
      despuesDeCerrar: true,
      alElegir: p.acciones?.alAnotar ?? sinAccion,
    },
  ],
  oportunidad: (p) => [
    {
      tipo: 'accion',
      clave: 'oportunidad',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.oportunidad,
      despuesDeCerrar: true,
      alElegir: p.acciones?.alNuevaOportunidad ?? sinAccion,
    },
  ],
  oportunidades: (p) => [
    {
      tipo: 'accion',
      clave: 'oportunidades',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.oportunidades,
      alElegir: p.verOportunidades ?? sinAccion,
    },
  ],
  editar: (p) => [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: etiquetaDeAccionDeLead('editar', p.editar?.modo ?? null),
      despuesDeCerrar: true,
      alElegir: p.editar?.alEditar ?? sinAccion,
    },
  ],
  etiquetas: (p) => [
    {
      tipo: 'accion',
      clave: 'etiquetas',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.etiquetas,
      despuesDeCerrar: true,
      alElegir: p.abrirEtiquetas,
    },
  ],
  favorito: (p) => [
    {
      tipo: 'casilla',
      clave: 'favorito',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.favorito,
      marcada: p.marcas.marcas.esFavorito,
      deshabilitada: p.marcas.enCurso.favorito,
      alCambiar: (valor) => void p.marcas.favorito(valor).then(p.alMarcar),
    },
  ],
  tachado: (p) => [
    {
      tipo: 'casilla',
      clave: 'tachado',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.tachado,
      marcada: p.marcas.marcas.estaTachado,
      deshabilitada: p.marcas.enCurso.tachado,
      cierra: true,
      alCambiar: (valor) => void p.marcas.tachado(valor).then(p.alMarcar),
    },
  ],
  actividad: (p) => [
    {
      tipo: 'accion',
      clave: 'actividad',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.actividad,
      alElegir: p.verActividad ?? sinAccion,
    },
  ],
  papelera: (p) => {
    const motivo = p.papelera?.motivo ?? null
    const enviar: AccionDeMenu = {
      tipo: 'accion',
      clave: 'papelera',
      etiqueta: ETIQUETA_DE_ACCION_DE_LEAD.papelera,
      icono: <Trash2Icon aria-hidden />,
      destructiva: true,
      deshabilitada: p.envio.enCurso || motivo !== null,
      alElegir: () => {
        void p.envio.enviar([p.leadId]).then((entro) => {
          if (entro) {
            p.papelera?.alEnviado?.()
          }
        })
      },
    }
    if (motivo === null) {
      return [enviar]
    }
    // Con un vehículo vinculado se ve apagada, con el motivo, y ofrece ir a «Vehículos».
    return [
      enviar,
      { tipo: 'nota', clave: 'motivo-papelera', texto: motivo },
      {
        tipo: 'accion',
        clave: 'ir-a-vehiculos',
        etiqueta: 'Ir a «Vehículos»',
        icono: <CarFrontIcon aria-hidden />,
        alElegir: p.papelera?.alIrAVehiculos ?? sinAccion,
      },
    ]
  },
}

// Las líneas del «⋯», en el orden de la lista única y con un separador entre bloques.
export function lineasDelMenu(p: Lineas, puedeEnviar: boolean): AccionDeMenu[] {
  const { carga } = p
  if (carga?.aviso) {
    return [{ tipo: 'nota', clave: 'aviso', texto: carga.aviso }]
  }
  if (carga?.cargando) {
    return [{ tipo: 'nota', clave: 'cargando', texto: 'Cargando…' }]
  }
  const bloques = accionesDeLead({
    cotizar: p.cotizar !== undefined,
    actuar: p.acciones !== undefined,
    verOportunidades: p.verOportunidades !== undefined,
    editar: p.editar?.modo ?? null,
    actividad: p.verActividad !== undefined,
    enviar: puedeEnviar,
  })
  return bloques.flatMap((bloque, indice) => [
    ...(indice > 0 ? [{ tipo: 'separador' as const, clave: `separador-${String(indice)}` }] : []),
    ...bloque.flatMap((clave) => LINEAS[clave](p)),
  ])
}
