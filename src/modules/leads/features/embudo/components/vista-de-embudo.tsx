'use client'

import { useMemo } from 'react'
import { ProveedorDeMarcasDeVisto } from '@/modules/equipo/client'
import { Aviso } from '@/shared/ui/aviso'
import { EstadoVacio } from '@/shared/ui/estados'
import { VistaYOpciones, type GrupoDeVistaYOpciones } from '@/shared/ui/vista-y-opciones'
import type { Embudo } from '../../../entities/embudo'
import { idsDeLeadsDelTablero, totalDelTablero, type Tablero } from '../../../entities/tablero'
import { DialogoDeEtiquetas } from '../../etiquetas/components/dialogo-de-etiquetas'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { AccionesDeFila } from '../../listado/components/acciones-de-fila'
import type { ParaElMenuDelEmbudo } from '../lecturas'
import { useTablero } from '../hooks/use-tablero'
import { useVistaDeEmbudo } from '../hooks/use-vista-de-embudo'
import { AccionesDelEmbudo } from './acciones-del-embudo'
import { BusquedaDelEmbudo, ID_DE_LA_BUSQUEDA_DEL_EMBUDO } from './busqueda-del-embudo'
import { ConmutadorDeVista } from './conmutador-de-vista'
import { ProveedorDelMenuDelEmbudo, useMenuDelEmbudo } from './menu-de-lead-del-embudo'
import { NuevoEmbudo } from './nuevo-embudo'
import { PanelDeEtapas } from './panel-de-etapas'
import { PrimerEmbudo } from './primer-embudo'
import { SelectorDeEmbudo } from './selector-de-embudo'
import { TableroDeEmbudo } from './tablero-de-embudo'

type Props = { embudos: Embudo[]; tablero: Tablero | null; paraElMenu: ParaElMenuDelEmbudo }

// «Lista | Embudo» en «Vista y opciones», en el mismo lugar que en la lista.
const GRUPO_DE_VISTA: GrupoDeVistaYOpciones = {
  clave: 'vista',
  titulo: 'Vista',
  contenido: <ConmutadorDeVista actual="embudo" />,
  resumen: 'Embudo',
}

// `/leads?vista=embudo`: el kanban de las oportunidades propias en el embudo elegido. La primera vez
// prepara el embudo por defecto. Los filtros de la lista no se aplican aquí, y la pantalla lo dice.
export function VistaDeEmbudo({ embudos, tablero, paraElMenu }: Props) {
  if (!tablero || embudos.length === 0) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <h1 className="sr-only">Embudo</h1>
        <div className="flex">
          <VistaYOpciones grupos={[GRUPO_DE_VISTA]} />
        </div>
        <PrimerEmbudo />
      </div>
    )
  }
  return <ConTablero embudos={embudos} inicial={tablero} paraElMenu={paraElMenu} />
}

type PropsDeLaBarra = {
  embudos: Embudo[]
  actual: string
  alElegirEmbudo: (id: string) => void
  alAbrirEtapas: () => void
  alAbrirNuevo: () => void
}

// Arriba del kanban: el selector de embudo (elige qué se ve, como un filtro), la búsqueda (crece) y «Vista y opciones» con «Lista | Embudo»,
// «Etapas…» y «Nuevo embudo…».
function BarraDelEmbudo({
  embudos,
  actual,
  alElegirEmbudo,
  alAbrirEtapas,
  alAbrirNuevo,
}: PropsDeLaBarra) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SelectorDeEmbudo embudos={embudos} actual={actual} alElegir={alElegirEmbudo} />
      <BusquedaDelEmbudo />
      <VistaYOpciones
        grupos={[
          GRUPO_DE_VISTA,
          {
            clave: 'embudo',
            titulo: 'Embudo',
            contenido: (
              <AccionesDelEmbudo alAbrirEtapas={alAbrirEtapas} alAbrirNuevo={alAbrirNuevo} />
            ),
          },
        ]}
      />
    </div>
  )
}

function ConTablero(props: {
  embudos: Embudo[]
  inicial: Tablero
  paraElMenu: ParaElMenuDelEmbudo
}) {
  const { embudos, inicial, paraElMenu } = props
  const vista = useVistaDeEmbudo()
  const estado = useTablero(inicial)
  const embudo = embudos.find((e) => e.id === inicial.embudo.id)
  const vacio = totalDelTablero(estado.tablero) === 0
  // «Visto» del módulo leads en cada tarjeta (el enlace al lead): una lectura por pantalla, los primeros 200 leads.
  const idsDeLeads = useMemo(() => idsDeLeadsDelTablero(estado.tablero), [estado.tablero])
  // El «⋯» de cada tarjeta es el del lead (`MenuDeLead`): sus etiquetas, «Gestionar» y los modales de anotar y agendar viven acá, una vez.
  const menu = useMenuDelEmbudo(paraElMenu)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <h1 className="sr-only">Embudo</h1>
      <BarraDelEmbudo
        embudos={embudos}
        actual={inicial.embudo.id}
        alElegirEmbudo={vista.elegirEmbudo}
        alAbrirEtapas={vista.abrirEtapas}
        alAbrirNuevo={vista.abrirNuevo}
      />
      <Aviso tono="info">
        <p>
          {estado.tablero.busqueda
            ? `Buscando «${estado.tablero.busqueda}» en tus oportunidades: el título o el nombre del lead, en todas las etapas.`
            : 'Aquí ves tus oportunidades. Los filtros de la lista no se aplican en esta vista; para llegar a una, búscala.'}
        </p>
      </Aviso>
      {/* Sin oportunidades se dice, y las columnas se ven igual: muestran las etapas del embudo. */}
      {vacio ? (
        <EstadoVacio
          compacto
          titulo="Todavía no tienes oportunidades en este embudo"
          descripcion="Crea una desde la ficha de un lead, en «Oportunidades»."
        />
      ) : null}
      <ProveedorDelMenuDelEmbudo valor={menu.valor}>
        <ProveedorDeMarcasDeVisto modulo="leads" tipo="lead" ids={idsDeLeads} abierto={null}>
          <TableroDeEmbudo
            estado={estado}
            etapaDeLaUrl={vista.etapa}
            alElegirEtapa={vista.elegirEtapa}
            alIrABuscar={() => {
              document.getElementById(ID_DE_LA_BUSQUEDA_DEL_EMBUDO)?.focus()
            }}
          />
        </ProveedorDeMarcasDeVisto>
      </ProveedorDelMenuDelEmbudo>
      {vista.etapasAbierto && embudo ? (
        <PanelDeEtapas
          key={embudo.actualizadoEn}
          embudo={embudo}
          embudos={embudos}
          alCerrar={vista.cerrarPanel}
        />
      ) : null}
      {vista.nuevoAbierto ? (
        <NuevoEmbudo
          embudos={embudos}
          alCerrar={vista.cerrarPanel}
          alCrear={(id) => {
            vista.cerrarPanel()
            vista.elegirEmbudo(id)
          }}
        />
      ) : null}
      <DialogoDeEtiquetas etiquetas={menu.etiquetas} />
      <AccionesDeFila filas={menu.leidos} puedeAnotar={paraElMenu.editar} />
      {/* Lo que se movió en otra pestaña (o en la ficha) aparece al volver. */}
      <RefrescarAlVolver activo={!vista.etapasAbierto && !vista.nuevoAbierto && !menu.hayPanel} />
    </div>
  )
}
