'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import { TituloDeBloqueConAccion } from '@/shared/ui/ficha-en-bloques'
import type { Embudo } from '../../../entities/embudo'
import { rutaDelEmbudoDelLead } from '../../../entities/embudo-del-lead'
import type { Oportunidad, OportunidadDelLead } from '../../../entities/oportunidad'
import { abiertasDeLoCargado, type AbiertaEnEmbudo } from '../../../entities/oportunidad-unica'
import {
  tableroDelLead,
  vacioDelTablero,
  type TableroDelLead,
} from '../../../entities/tablero-del-lead'
import { SelectorDeEmbudo } from '../../embudo/components/selector-de-embudo'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { useEmbudoDelBloque } from '../hooks/use-embudo-del-bloque'
import { useOportunidades } from '../hooks/use-oportunidades'
import { usePanelDeMovida } from '../hooks/use-panel-de-movida'
import { usePanelDeOportunidad } from '../hooks/use-panel-de-oportunidad'
import { TableroDelLeadDiferido } from './diferidos'
import { MenuDelBloque } from './menu-del-bloque'
import { MovidaDeLaFicha } from './movida-de-la-ficha'
import { PanelDeOportunidad } from './panel-de-oportunidad'

// Con un panel o un modal abierto el bloque no se vuelve a leer solo (reiniciaría lo escrito).
const hayPanelAbierto = (nueva: boolean, editando: unknown, movida: boolean) =>
  nueva || editando !== null || movida

type Props = {
  leadId: string
  inicial: readonly OportunidadDelLead[]
  embudos: readonly Embudo[]
  // El embudo que esta persona dejó a la vista la última vez (`leads.embudo_de_la_ficha`), o nada.
  embudoRecordado: string | null
  // Dónde ya tiene una abierta (de la primera lectura del servidor; lo cargado manda: `abiertasDeLoCargado`): al crear, esos embudos van apagados.
  abiertasPorEmbudo: readonly AbiertaEnEmbudo[]
  // Cartera y `leads.editar` (lo dice la base).
  puedoCrear: boolean
  // Tiene más de las que trajo el servidor: están en «Ver en el embudo».
  hayMas: boolean
}

// «Nueva» (su nombre accesible: «Nueva oportunidad»): la única acción del título.
function BotonNueva({ alAbrir }: { alAbrir: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 md:min-h-8"
      aria-label="Nueva oportunidad"
      onClick={alAbrir}
    >
      Nueva
    </Button>
  )
}

// «Ver en el embudo» al pie, sólo cuando algo no se dibuja: un enlace de texto, sin número, a la vista filtrada por el lead.
function VerEnElEmbudo({ href }: { href: string }) {
  return (
    <Link
      href={href as Route}
      className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) font-medium text-(--color-primario) underline-offset-2 hover:underline md:min-h-8"
    >
      Ver en el embudo
    </Link>
  )
}

type Oportunidades = ReturnType<typeof useOportunidades>

// El título: «Nueva» (si puede crear) y, a su lado, el «⋯» del bloque.
function TituloDelBloque(props: {
  puedoCrear: boolean
  alNueva: () => void
  verEnElEmbudo: string
}) {
  return (
    <TituloDeBloqueConAccion
      id="titulo-oportunidades"
      titulo="Oportunidades"
      accion={
        <div className="flex min-w-0 gap-1 [&>*:first-child]:grow">
          {props.puedoCrear ? <BotonNueva alAbrir={props.alNueva} /> : null}
          <MenuDelBloque verEnElEmbudo={props.verEnElEmbudo} />
        </div>
      }
    />
  )
}

type PropsDelTablero = {
  tablero: TableroDelLead<OportunidadDelLead> | null
  puedoCrear: boolean
  oportunidades: Oportunidades
  movida: ReturnType<typeof usePanelDeMovida>
  alEditar: (id: string) => void
}

// El tablero, o el vacío (sin embudo, o sin oportunidades de este lead en el elegido), y «Ver en el embudo» si algo no se dibuja.
function CuerpoDelTablero({
  tablero,
  puedoCrear,
  oportunidades,
  movida,
  alEditar,
}: PropsDelTablero) {
  if (tablero === null || tablero.vacio) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {vacioDelTablero(tablero?.embudo.nombre ?? null)}
      </p>
    )
  }
  return (
    <>
      <div className="min-h-24 min-w-0">
        <TableroDelLeadDiferido
          tablero={tablero}
          puedeEditar={puedoCrear}
          ocupada={oportunidades.ocupada}
          alMover={oportunidades.moverA}
          alPedirMotivo={movida.pedir}
          alEditar={(o) => {
            alEditar(o.id)
          }}
          alEliminar={(o) => void oportunidades.quitar(o)}
        />
      </div>
      {tablero.hayMasFuera ? <VerEnElEmbudo href={tablero.verEnElEmbudo} /> : null}
    </>
  )
}

type PropsDelPanel = {
  puedoCrear: boolean
  panel: ReturnType<typeof usePanelDeOportunidad>
  editando: OportunidadDelLead | null
  embudos: readonly Embudo[]
  embudo: Embudo | null
  abiertas: readonly AbiertaEnEmbudo[]
  leadId: string
  alGuardar: (oportunidad: Oportunidad) => void
  elegir: (embudoId: string) => void
}

// «Nueva oportunidad» o «Editar» en su panel con URL (empieza en el embudo que se ve).
function PanelDelBloque({ puedoCrear, panel, editando, embudo, elegir, ...resto }: PropsDelPanel) {
  if (!puedoCrear || !(panel.nueva || editando)) {
    return null
  }
  return (
    <PanelDeOportunidad
      key={editando?.actualizadoEn ?? 'nueva'}
      leadId={resto.leadId}
      oportunidad={editando}
      embudos={resto.embudos}
      embudoPreferido={embudo?.id ?? null}
      abiertas={resto.abiertas}
      alGuardar={(creada) => {
        resto.alGuardar(creada)
        // Una nueva en otro embudo que el que se ve: se pasa a ése, para que la persona la vea entrar.
        if (!editando && embudo && creada.embudoId !== embudo.id) {
          elegir(creada.embudoId)
        }
      }}
      alCerrar={panel.cerrar}
    />
  )
}

// El bloque «Oportunidades» de la ficha: el embudo de este lead. Una columna por etapa del embudo elegido (el selector sólo si quien mira tiene más
// de uno; recuerda el último), con las oportunidades de este lead en cada etapa, que se mueven arrastrando o con «Mover a» del «⋯» de cada una.
// «Nueva» en el título y, a su lado, el «⋯» del bloque con «Ver en el embudo» (la vista filtrada por este lead).
export function OportunidadesDelLead(props: Props) {
  const { leadId, inicial, embudos, puedoCrear } = props
  const panel = usePanelDeOportunidad()
  const movida = usePanelDeMovida()
  const oportunidades = useOportunidades(
    leadId,
    { oportunidades: inicial, hayMas: props.hayMas },
    embudos,
  )
  const { lista, hayMas, moverA, alGuardar } = oportunidades
  const { embudo, elegir } = useEmbudoDelBloque(embudos, props.embudoRecordado)
  const editando = panel.editando ? (lista.find((o) => o.id === panel.editando) ?? null) : null
  const tablero = embudo ? tableroDelLead({ lista, hayMas, embudo, leadId }) : null
  return (
    <section
      aria-labelledby="titulo-oportunidades"
      className="@container/oportunidades grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2"
    >
      <TituloDelBloque
        puedoCrear={puedoCrear}
        alNueva={panel.abrirNueva}
        verEnElEmbudo={tablero?.verEnElEmbudo ?? rutaDelEmbudoDelLead(null, leadId)}
      />
      {embudo && embudos.length > 1 ? (
        <div>
          <SelectorDeEmbudo embudos={embudos} actual={embudo.id} alElegir={elegir} cerrarAlElegir />
        </div>
      ) : null}
      <CuerpoDelTablero
        tablero={tablero}
        puedoCrear={puedoCrear}
        oportunidades={oportunidades}
        movida={movida}
        alEditar={panel.abrirEdicion}
      />
      <PanelDelBloque
        puedoCrear={props.puedoCrear}
        panel={panel}
        editando={editando}
        embudos={embudos}
        embudo={embudo}
        abiertas={abiertasDeLoCargado(props.abiertasPorEmbudo, lista, hayMas, embudos)}
        leadId={leadId}
        alGuardar={alGuardar}
        elegir={elegir}
      />
      <MovidaDeLaFicha
        activa={puedoCrear}
        panel={movida}
        lista={lista}
        embudos={embudos}
        moverA={moverA}
      />
      <RefrescarAlVolver activo={!hayPanelAbierto(panel.nueva, editando, movida.abierto)} />
    </section>
  )
}
