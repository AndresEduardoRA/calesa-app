'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_SECCION, type LeadDeFicha } from '../../../entities/ficha'
import { motivoParaNoEnviar } from '../../../entities/papelera'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { MenuDeLeadConMarcas } from '../../marcas/components/menu-de-lead'
import type { Marcas } from '../../marcas/hooks/use-marcas'
import { NuevaOportunidadDelLead } from '../../oportunidades/components/nueva-oportunidad-del-lead'
import { usePanelDeOportunidadRapida } from '../../oportunidades/hooks/use-panel-de-oportunidad-rapida'
import { rutaDeLasOportunidadesDe } from '../../../entities/oportunidad-rapida'
import { edicionDelMenu } from '../../../entities/acciones-de-lead'
import { useAbrirEnLaFicha } from '../hooks/use-abrir-en-la-ficha'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'

type Props = {
  ficha: LeadDeFicha
  // Las marcas de quien mira, que comparte con las insignias de la cabecera.
  marcas: Marcas
  etiquetas: Etiquetas
  alGestionar: () => void
  puedeEditar: boolean
  // Cartera y `leads.telefonos_extra.editar`: sin `puedeEditar`, el «⋯» ofrece «Editar teléfonos».
  puedeEditarExtras: boolean
  puedeEnviarAPapelera: boolean
  // La hoja de cotizar con este lead elegido, en el primer origen donde quien mira cotiza (la compone la página: `leads` no conoce `cotizaciones`); null si no cotiza.
  paraCotizar: string | null
  // `/actividad` de este lead, sólo con `actividad.ver` (la compone la página: `leads` no conoce `actividad`); null si no la ve.
  paraActividad: string | null
}

// Enviar a la papelera desde la ficha: con un vehículo vinculado se apaga con su motivo y ofrece ir a «Vehículos» (salta a Relacionados,
// donde está su gestión); enviado, lleva al listado.
function papeleraDeLaFicha(
  ficha: LeadDeFicha,
  irA: (url: string) => void,
  saltarA: (ancla: string, url: string) => void,
) {
  return {
    motivo: motivoParaNoEnviar(ficha.vehiculosVinculados),
    alEnviado: () => {
      irA(RUTAS.leads)
    },
    alIrAVehiculos: () => {
      saltarA('relacionados', `${RUTAS.leads}/${ficha.id}?${CLAVE_DE_SECCION}=vehiculos`)
    },
  }
}

// El «⋯» de la cabecera de la ficha, con la lista de siempre (`accionesDeLead()`): «Cotizar lead» (sólo a quien cotiza, con `returnTo` a
// la ficha) y «Editar lead» o «Editar teléfonos» (el panel de edición, `?panel=editar-lead`) están ahí y en ningún otro botón. Anotar y agendar
// abren su modal (del bloque «Seguimiento») y llevan la página a ese bloque, sin navegar. «Nueva oportunidad…» abre su modal (con el aviso de las que ya tiene) donde
// se está, y «Ver oportunidades» va a su sección. Enviar a la papelera se hace y ofrece «Deshacer»; después lleva al
// listado, porque la ficha ya no existe para nadie. Con un vehículo vinculado que quien mira ve, se apaga con el motivo y ofrece ir a
// «Vehículos»; si lo frena uno que no ve, lo dice la base al intentar.
export function AccionesDeLaFicha(props: Props) {
  const {
    ficha,
    marcas,
    etiquetas,
    alGestionar,
    puedeEditar,
    puedeEditarExtras,
    puedeEnviarAPapelera,
    paraCotizar,
    paraActividad,
  } = props
  const router = useRouter()
  const oportunidad = usePanelDeOportunidadRapida()
  const panel = usePanelDeLead()
  const edicion = edicionDelMenu({ editar: puedeEditar, telefonos: puedeEditarExtras })
  const irA = (url: string) => {
    router.push(url as Route)
  }
  const enLaFicha = useAbrirEnLaFicha(irA)
  return (
    <>
      <MenuDeLeadConMarcas
        leadId={ficha.id}
        nombre={ficha.nombre}
        marcas={marcas}
        etiquetas={etiquetas}
        alGestionar={alGestionar}
        puedeEnviar={puedeEnviarAPapelera}
        paraCotizar={paraCotizar}
        acciones={
          puedeEditar
            ? {
                alAnotar: enLaFicha.anotar,
                alAgendar: enLaFicha.agendar,
                alNuevaOportunidad: oportunidad.abrir,
              }
            : undefined
        }
        verOportunidades={
          ficha.enCartera
            ? () => {
                enLaFicha.irA('oportunidades', rutaDeLasOportunidadesDe(ficha.id))
              }
            : undefined
        }
        editar={edicion ? { modo: edicion, alEditar: panel.abrir } : undefined}
        paraActividad={paraActividad}
        papelera={papeleraDeLaFicha(ficha, irA, enLaFicha.irA)}
      />
      {puedeEditar ? (
        <NuevaOportunidadDelLead
          leadId={ficha.id}
          nombre={ficha.nombre}
          abierto={oportunidad.abierto}
          alCerrar={oportunidad.cerrar}
          alCrear={router.refresh}
        />
      ) : null}
    </>
  )
}
