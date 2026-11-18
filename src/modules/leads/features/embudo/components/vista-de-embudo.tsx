'use client'

import { useMemo } from 'react'
import { ProveedorDeMarcasDeVisto } from '@/modules/equipo/client'
import { VistaYOpciones } from '@/shared/ui/vista-y-opciones'
import type { Embudo } from '../../../entities/embudo'
import { idsDeLeadsDelTablero, totalDelTablero, type Tablero } from '../../../entities/tablero'
import { DialogoDeEtiquetas } from '../../etiquetas/components/dialogo-de-etiquetas'
import type { RutasDelMenuDeLead } from '../../../entities/ruta-por-lead'
import { EdicionDesdeLaLista } from '../../ficha/components/edicion-desde-la-lista'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { AccionesDeFila } from '../../listado/components/acciones-de-fila'
import type { ParaElMenuDelEmbudo } from '../lecturas'
import { useTablero } from '../hooks/use-tablero'
import { useQuitarLeadIgnorado, useVistaDeEmbudo } from '../hooks/use-vista-de-embudo'
import { AvisoDelTablero } from './aviso-del-tablero'
import { BarraDelEmbudo, GRUPO_DE_VISTA } from './barra-del-embudo'
import { ID_DE_LA_BUSQUEDA_DEL_EMBUDO } from './busqueda-del-embudo'
import { ProveedorDelMenuDelEmbudo, useMenuDelEmbudo } from './menu-de-lead-del-embudo'
import { NuevoEmbudo } from './nuevo-embudo'
import { PanelDeEtapas } from './panel-de-etapas'
import { PrimerEmbudo } from './primer-embudo'
import { TableroDeEmbudo } from './tablero-de-embudo'

type Props = {
  embudos: Embudo[]
  tablero: Tablero | null
  paraElMenu: ParaElMenuDelEmbudo
  // Se pidió `?lead=` y el servidor no lo aceptó: se quita de la URL.
  leadIgnorado: boolean
  // «Cotizar lead» y «Ver actividad» del «⋯» de cada tarjeta, con `MARCADOR_DE_LEAD` (las arma `src/app` una vez por página).
  rutas: RutasDelMenuDeLead
}

// `/leads?vista=embudo`: el kanban de las oportunidades propias en el embudo elegido. La primera vez
// prepara el embudo por defecto. Los filtros de la lista no se aplican aquí, y la pantalla lo dice.
export function VistaDeEmbudo({ embudos, tablero, paraElMenu, rutas, leadIgnorado }: Props) {
  useQuitarLeadIgnorado(leadIgnorado)
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
  return <ConTablero embudos={embudos} inicial={tablero} paraElMenu={paraElMenu} rutas={rutas} />
}

// Lo que abren los «⋯» de las tarjetas, montado una vez: gestionar etiquetas, anotar, agendar o crear una oportunidad, y editar el lead.
function PanelesDelMenu({
  menu,
  paraElMenu,
}: {
  menu: ReturnType<typeof useMenuDelEmbudo>
  paraElMenu: ParaElMenuDelEmbudo
}) {
  return (
    <>
      <DialogoDeEtiquetas etiquetas={menu.etiquetas} />
      <AccionesDeFila filas={menu.leidos} puedeAnotar={paraElMenu.editar} />
      <EdicionDesdeLaLista
        edicion={menu.edicion}
        permisos={{
          editar: paraElMenu.editar,
          telefonos: paraElMenu.telefonos,
          configurar: paraElMenu.configurar,
        }}
      />
    </>
  )
}

function ConTablero(props: {
  embudos: Embudo[]
  inicial: Tablero
  paraElMenu: ParaElMenuDelEmbudo
  rutas: RutasDelMenuDeLead
}) {
  const { embudos, inicial, paraElMenu, rutas } = props
  const vista = useVistaDeEmbudo()
  const estado = useTablero(inicial)
  const embudo = embudos.find((e) => e.id === inicial.embudo.id)
  const vacio = totalDelTablero(estado.tablero) === 0
  // «Visto» del módulo leads en cada tarjeta (el enlace al lead): una lectura por pantalla, los primeros 200 leads.
  const idsDeLeads = useMemo(() => idsDeLeadsDelTablero(estado.tablero), [estado.tablero])
  // El «⋯» de cada tarjeta es el del lead (`MenuDeLead`): sus etiquetas, «Gestionar» y los modales de anotar y agendar viven acá, una vez.
  const menu = useMenuDelEmbudo(paraElMenu, rutas)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <h1 className="sr-only">Embudo</h1>
      <BarraDelEmbudo
        embudos={embudos}
        actual={inicial.embudo.id}
        lead={inicial.lead}
        alElegirEmbudo={vista.elegirEmbudo}
        alQuitarLead={vista.quitarLead}
        alAbrirEtapas={vista.abrirEtapas}
        alAbrirNuevo={vista.abrirNuevo}
      />
      <AvisoDelTablero tablero={estado.tablero} vacio={vacio} alVerTodas={vista.quitarLead} />
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
      <PanelesDelMenu menu={menu} paraElMenu={paraElMenu} />
      {/* Lo que se movió en otra pestaña (o en la ficha) aparece al volver. */}
      <RefrescarAlVolver activo={!vista.etapasAbierto && !vista.nuevoAbierto && !menu.hayPanel} />
    </div>
  )
}
