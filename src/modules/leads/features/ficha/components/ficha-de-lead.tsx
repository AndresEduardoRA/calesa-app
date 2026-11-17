'use client'

import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  BloqueDeFicha,
  FichaEnDosColumnas,
  IndiceDeBloques,
  useIrAlLlegar,
} from '@/shared/ui/ficha-en-bloques'
import type { AccionesDeCartera, PersonaDeCartera } from '../../../entities/cartera'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { CampoDeLead } from '../../../entities/campo'
import type { Etiqueta } from '../../../entities/etiqueta'
import {
  anclaDeLaSeccion,
  bloquesDelIndice,
  type AnclaDeBloque,
} from '../../../entities/bloques-de-la-ficha'
import type { LeadDeFicha, LoQueVe, SeccionDeLead } from '../../../entities/ficha'
import { useEtiquetas, type Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { usePanelDeEtiquetas } from '../../etiquetas/hooks/use-panel-de-etiquetas'
import { InsigniasDeMarcas } from '../../marcas/components/insignias-de-marcas'
import { useMarcas, type Marcas } from '../../marcas/hooks/use-marcas'
import { AccionesDeLaFicha } from './acciones-de-la-ficha'
import { AvisoDeVencidos } from './aviso-de-vencidos'
import { LateralDeLaFicha } from './lateral-de-la-ficha'
import { PanelesDeLaFicha } from './paneles-de-la-ficha'

type Props = {
  ficha: LeadDeFicha
  // Los campos activos del layout: los que dibuja «Datos». El panel de edición lee el layout completo al abrirse.
  campos: readonly CampoDeLead[]
  // El origen y el tipo de este lead, también apagados: lo nombran. Los catálogos completos los lee el panel de edición al abrirse.
  origen: { nombre: string; activo: boolean; icono: string | null } | null
  tipo: TipoDeLeadEnCatalogo | null
  puedeEditar: boolean
  // Cartera y `leads.editar`: «Cambiar el principal» en el panel de edición.
  puedeCambiarTelefono: boolean
  // Cartera y `leads.telefonos_extra.editar`: administrar los extras en el panel de edición (sin `leads.editar`, el panel abre sólo con
  // los teléfonos).
  puedeEditarExtras: boolean
  // `leads.configurar`: el enlace «Cambiar el máximo».
  puedeConfigurar: boolean
  // El bloque al que lleva `?seccion=` (los enlaces de siempre).
  seccion: SeccionDeLead
  // Los bloques, cada uno detrás de su `<Suspense>` (los compone la página: los de `vehiculos` y `cotizaciones` viven en esos módulos).
  // Uno que quien mira no ve llega nulo y no se dibuja ni aparece en el índice (`ve`).
  seguimientos: ReactNode
  oportunidades: ReactNode
  // Relacionados con la gestión de «Vehículos» al pie.
  relacionados: ReactNode
  // «Cotizaciones»: se pide al acercarse a la vista.
  cotizaciones: ReactNode
  // «Acceso al portal», en la columna de la izquierda.
  portal: ReactNode
  ve: LoQueVe
  // Las etiquetas de quien mira (para nombrar las del lead y elegir otras).
  etiquetas: readonly Etiqueta[]
  // Quién lo tiene, y lo que quien mira puede hacer con eso (compartir, transferir, quitar, salir).
  cartera: readonly PersonaDeCartera[]
  accionesDeCartera: AccionesDeCartera
  // Quien mira puede enviar este lead a la papelera (`leads.eliminar`: «todos», o «propios» siendo el dueño).
  puedeEnviarAPapelera: boolean
  // La ruta de la hoja de cotizar con este lead, si quien mira cotiza en algún origen (la arma la página).
  paraCotizar: string | null
  // `/actividad` de este lead, si quien mira tiene `actividad.ver` (la arma la página): «Ver actividad» en el «⋯».
  paraActividad: string | null
}

// «Cotizaciones» hasta acercarse a la vista (se lee recién ahí): del alto aproximado del bloque, para que un salto no se mueva.
const ESQUELETO_DE_COTIZACIONES = (
  <div aria-hidden className="grid gap-2">
    <Skeleton className="h-16 rounded-(--radius-card)" />
    <Skeleton className="h-16 rounded-(--radius-card)" />
  </div>
)

// El enlace de vuelta al listado, arriba de todo.
function VolverALeads() {
  return (
    <Link
      href={RUTAS.leads as Route}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8"
    >
      <ArrowLeftIcon aria-hidden />
      Leads
    </Link>
  )
}

type PropsDelLateral = Pick<
  Props,
  | 'ficha'
  | 'campos'
  | 'origen'
  | 'tipo'
  | 'puedeEditar'
  | 'puedeEnviarAPapelera'
  | 'paraCotizar'
  | 'paraActividad'
  | 'cartera'
  | 'accionesDeCartera'
  | 'portal'
> & {
  marcas: Marcas
  etiquetas: Etiquetas
  alGestionar: () => void
  conEditarTelefonos: boolean
}

// La columna de la izquierda con las acciones de la cabecera («Editar», «Cotizar» y el «⋯») y las insignias de quien mira.
function LateralConAcciones({ marcas, etiquetas, alGestionar, ...props }: PropsDelLateral) {
  const { ficha, puedeEditar, puedeEnviarAPapelera, paraCotizar, paraActividad } = props
  return (
    <LateralDeLaFicha
      {...props}
      acciones={
        <AccionesDeLaFicha
          {...{ ficha, marcas, etiquetas, alGestionar, puedeEditar }}
          {...{ puedeEnviarAPapelera, paraCotizar, paraActividad }}
        />
      }
      marcas={
        <InsigniasDeMarcas marcas={marcas.marcas} etiquetas={etiquetas.lista} conFavorito={false} />
      }
    />
  )
}

// La ficha de un lead en dos columnas: a la izquierda (pegajosa) quién es, sus datos, teléfonos, quién lo tiene y el portal; a la derecha
// el índice y los bloques a la vista —seguimientos y recordatorios, oportunidades, relacionados y cotizaciones—, sin pestañas ni
// acordeones. `?seccion=` lleva a su bloque y le da el foco a su título.
export function FichaDeLead({
  ficha,
  campos,
  origen,
  tipo,
  puedeEditar,
  seccion,
  ve,
  etiquetas: lista,
  cartera,
  accionesDeCartera,
  puedeEnviarAPapelera,
  paraCotizar,
  paraActividad,
  seguimientos,
  oportunidades,
  relacionados,
  cotizaciones,
  portal,
  ...telefonos
}: Props) {
  const marcas = useMarcas(ficha.id, ficha.marcas)
  const etiquetas = useEtiquetas(lista)
  const gestionar = usePanelDeEtiquetas()
  useIrAlLlegar(anclaDeLaSeccion(seccion))
  const bloques = bloquesDelIndice(ve)
  const contenido: Record<AnclaDeBloque, ReactNode> = {
    seguimientos,
    oportunidades,
    relacionados,
    cotizaciones,
  }
  return (
    <>
      <FichaEnDosColumnas
        antes={
          <>
            <VolverALeads />
            <AvisoDeVencidos vencidos={ficha.recordatoriosVencidos} />
          </>
        }
        etiquetaDelLateral={`Datos de ${ficha.nombre}`}
        lateral={
          <LateralConAcciones
            {...{ ficha, campos, origen, tipo, puedeEditar, puedeEnviarAPapelera, paraCotizar }}
            {...{ paraActividad, cartera, accionesDeCartera, marcas, etiquetas }}
            alGestionar={gestionar.abrir}
            conEditarTelefonos={telefonos.puedeEditarExtras && !puedeEditar}
            portal={ve.portal ? portal : null}
          />
        }
        indice={
          <IndiceDeBloques bloques={bloques.map(({ ancla, etiqueta }) => ({ ancla, etiqueta }))} />
        }
      >
        {bloques.map((bloque) => (
          <BloqueDeFicha
            key={bloque.ancla}
            ancla={bloque.ancla}
            titulo={bloque.titulo}
            {...(bloque.ancla === 'cotizaciones'
              ? { conTitulo: true, alAcercarse: true, esqueleto: ESQUELETO_DE_COTIZACIONES }
              : {})}
          >
            {contenido[bloque.ancla]}
          </BloqueDeFicha>
        ))}
      </FichaEnDosColumnas>
      <PanelesDeLaFicha
        ficha={ficha}
        puedeEditar={puedeEditar}
        {...telefonos}
        etiquetas={etiquetas}
        gestionando={gestionar.abierto}
      />
    </>
  )
}
