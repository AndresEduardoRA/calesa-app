'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { conVuelta } from '@/shared/lib/rutas'
import { MasAcciones } from '@/shared/ui/lista'
import type { MarcasDeLead } from '../../../entities/marcas'
import { SelectorDeEtiquetas } from '../../etiquetas/components/selector-de-etiquetas'
import { useEnvioAPapelera } from '../../papelera/hooks/use-envio-a-papelera'
import { useMarcas, type Marcas } from '../hooks/use-marcas'
import { lineasDelMenu, type PropsComunes } from './lineas-del-menu-de-lead'

type PropsConMarcas = PropsComunes & {
  // Las marcas de quien mira sobre este lead, con lo que se ve mientras viaja cada pedido (`useMarcas`).
  marcas: Marcas
}

// Ir a otra página desde el menú: «Cotizar lead» vuelve a donde se estaba (`returnTo`, con su consulta: la lista con sus filtros, la ficha).
function useIrA(paraCotizar: string | null | undefined, paraActividad: string | null | undefined) {
  const router = useRouter()
  const ir = (ruta: string) => {
    router.push(ruta as Route)
  }
  return {
    cotizar: paraCotizar
      ? () => {
          ir(conVuelta(paraCotizar, `${window.location.pathname}${window.location.search}`))
        }
      : undefined,
    verActividad: paraActividad
      ? () => {
          ir(paraActividad)
        }
      : undefined,
  }
}

// El «⋯» de un lead con sus marcas ya en un `useMarcas`: la ficha las comparte con las insignias de su cabecera. «Etiquetas…» cierra el
// menú y abre el selector contra el mismo botón; agendar, anotar y editar abren su modal o panel y el foco vuelve a este botón. Nada de lo
// que pasa adentro abre la fila ni la tarjeta de la lista (`<MasAcciones>`).
export function MenuDeLeadConMarcas(props: PropsConMarcas) {
  const { marcas, leadId, nombre, etiquetas, alGestionar, puedeEnviar, alAbrir } = props
  const envio = useEnvioAPapelera()
  const irA = useIrA(props.paraCotizar, props.paraActividad)
  const boton = useRef<HTMLButtonElement>(null)
  const [selector, setSelector] = useState(false)
  const lista = lineasDelMenu(
    {
      marcas,
      envio,
      leadId,
      acciones: props.acciones,
      papelera: props.papelera,
      alMarcar: props.alMarcar,
      carga: props.carga,
      cotizar: irA.cotizar,
      verActividad: irA.verActividad,
      verOportunidades: props.verOportunidades,
      editar: props.editar,
      abrirEtiquetas: () => {
        setSelector(true)
      },
    },
    puedeEnviar,
  )
  return (
    <MasAcciones nombre={nombre} id={leadId} acciones={lista} botonRef={boton} alAbrir={alAbrir}>
      <SelectorDeEtiquetas
        etiquetas={etiquetas}
        puestas={marcas.marcas.etiquetas}
        alCambiar={(id, valor) => void marcas.etiqueta(id, valor).then(props.alMarcar)}
        enCurso={marcas.enCurso.etiquetas}
        alGestionar={alGestionar}
        abierto={selector}
        alCambiarAbierto={setSelector}
        ancla={boton}
      />
    </MasAcciones>
  )
}

type PropsDeLaFila = PropsComunes & { marcas: MarcasDeLead }

// El «⋯» de un lead de una lista o de una tarjeta: lleva sus propias marcas (las de la fila).
export function MenuDeLead({ marcas: inicial, ...resto }: PropsDeLaFila) {
  const marcas = useMarcas(resto.leadId, inicial)
  return <MenuDeLeadConMarcas {...resto} marcas={marcas} />
}
