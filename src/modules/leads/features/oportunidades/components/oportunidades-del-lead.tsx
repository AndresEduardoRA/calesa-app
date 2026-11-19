'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import { TituloDeBloqueConAccion } from '@/shared/ui/ficha-en-bloques'
import type { Embudo } from '../../../entities/embudo'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import { abiertasDeLoCargado, type AbiertaEnEmbudo } from '../../../entities/oportunidad-unica'
import { oportunidadesDelBloque } from '../../../entities/oportunidades-del-bloque'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { useOportunidades } from '../hooks/use-oportunidades'
import { usePanelDeMovida } from '../hooks/use-panel-de-movida'
import { usePanelDeOportunidad } from '../hooks/use-panel-de-oportunidad'
import { FilaDeOportunidad } from './fila-de-oportunidad'
import { MovidaDeLaFicha } from './movida-de-la-ficha'
import { PanelDeOportunidad } from './panel-de-oportunidad'

// Con un panel o un modal abierto el bloque no se vuelve a leer solo (reiniciaría lo escrito).
const hayPanelAbierto = (nueva: boolean, editando: unknown, movida: boolean) =>
  nueva || editando !== null || movida

type Props = {
  leadId: string
  inicial: readonly OportunidadDelLead[]
  embudos: readonly Embudo[]
  // Dónde ya tiene una abierta (de la primera lectura del servidor; lo cargado manda: `abiertasDeLoCargado`): al crear, esos embudos van apagados.
  abiertasPorEmbudo: readonly AbiertaEnEmbudo[]
  // Cartera y `leads.editar` (lo dice la base).
  puedoCrear: boolean
  // Tiene más de las que trajo el servidor: están en «Ver todas».
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

// «Ver todas»: un enlace de texto, sin número, al embudo filtrado por el lead.
function VerTodas({ href }: { href: string }) {
  return (
    <Link
      href={href as Route}
      className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) font-medium text-(--color-primario) underline-offset-2 hover:underline md:min-h-8"
    >
      Ver todas
    </Link>
  )
}

// El bloque «Oportunidades» de la ficha: las abiertas de quien mira sobre el lead (una por embudo), en filas de una línea, hasta tres; las
// cerradas y lo que no se ve, en «Ver todas» (el embudo filtrado por este lead). «Nueva» en el título. Mover, editar y eliminar, en el «⋯»
// de cada fila; una que se cierra al moverla sale de la vista.
export function OportunidadesDelLead(props: Props) {
  const { leadId, inicial, embudos, puedoCrear } = props
  const panel = usePanelDeOportunidad()
  const movida = usePanelDeMovida()
  const { lista, hayMas, moverA, quitar, ocupada, alGuardar } = useOportunidades(
    leadId,
    { oportunidades: inicial, hayMas: props.hayMas },
    embudos,
  )
  const editando = panel.editando ? (lista.find((o) => o.id === panel.editando) ?? null) : null
  const { aLaVista, verTodas } = oportunidadesDelBloque({ lista, hayMas, embudos, leadId })
  return (
    <section
      aria-labelledby="titulo-oportunidades"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2"
    >
      <TituloDeBloqueConAccion
        id="titulo-oportunidades"
        titulo="Oportunidades"
        accion={puedoCrear ? <BotonNueva alAbrir={panel.abrirNueva} /> : null}
      />
      {aLaVista.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Sin oportunidades abiertas.
        </p>
      ) : (
        <ul
          aria-label="Oportunidades abiertas"
          className="@container/oportunidades grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line)"
        >
          {aLaVista.map((o) => (
            <li key={o.id} className="min-w-0">
              <FilaDeOportunidad
                oportunidad={o}
                etapas={embudos.find((e) => e.id === o.embudoId)?.etapas ?? []}
                nombrarEmbudo={embudos.length > 1}
                puedeEditar={puedoCrear}
                ocupada={ocupada === o.id}
                alMover={(etapa, motivo) => moverA(o, etapa, motivo)}
                alPedirMotivo={(etapa) => {
                  movida.pedir(o, etapa)
                }}
                alEditar={() => {
                  panel.abrirEdicion(o.id)
                }}
                alEliminar={() => void quitar(o)}
              />
            </li>
          ))}
        </ul>
      )}
      {verTodas === null ? null : <VerTodas href={verTodas} />}
      {puedoCrear && (panel.nueva || editando) ? (
        <PanelDeOportunidad
          key={editando?.actualizadoEn ?? 'nueva'}
          leadId={leadId}
          oportunidad={editando}
          embudos={embudos}
          abiertas={abiertasDeLoCargado(props.abiertasPorEmbudo, lista, hayMas, embudos)}
          alGuardar={alGuardar}
          alCerrar={panel.cerrar}
        />
      ) : null}
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
