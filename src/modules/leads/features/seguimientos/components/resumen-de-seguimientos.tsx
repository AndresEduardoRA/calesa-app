'use client'

import { useState } from 'react'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques'
import { MasAcciones } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { PaginaDeRecordatorios } from '../../../entities/pagina-de-recordatorios'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { PaginaDeSeguimientos } from '../../../entities/seguimiento'
import { RecordatoriosDelLead } from '../../recordatorios/components/recordatorios-del-lead'
import { useSeguimientos } from '../hooks/use-seguimientos'
import { useTodosDeLaFicha, type TodosAbiertos } from '../hooks/use-todos-de-la-ficha'
import { DrawerDeTodos } from './drawer-de-todos'
import { LineaDeSeguimientos } from './linea-de-seguimientos'
import { MasDelSeguimiento } from './mas-del-seguimiento'

type Props = {
  leadId: string
  leadNombre: string
  seguimientos: PaginaDeSeguimientos
  recordatorios: PaginaDeRecordatorios
  tipos: readonly TipoDeSeguimiento[]
}

// La fila del título: el `h2` crece y se parte en líneas; a su derecha, de 44 px en el celular, el «+» (anotar o agendar) y el «⋯» con
// «Ver tus recordatorios» (siempre: los recordatorios son de quien mira). No baja de renglón: dos iconos caben al 200 % en la columna.
function TituloDelSeguimiento({
  todos,
  puedoAnotar,
  puedoAgendar,
  hayTipos,
}: {
  todos: TodosAbiertos
  puedoAnotar: boolean
  puedoAgendar: boolean
  hayTipos: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <h2
        id="seguimientos-titulo"
        tabIndex={-1}
        className={`${TITULO_DE_BLOQUE} min-w-0 grow break-words`}
      >
        Seguimiento
      </h2>
      <MasDelSeguimiento
        puedoAnotar={puedoAnotar}
        puedoAgendar={puedoAgendar}
        hayTipos={hayTipos}
      />
      <MasAcciones
        nombre="«Seguimiento»"
        acciones={[
          {
            tipo: 'accion',
            clave: 'ver-recordatorios',
            etiqueta: 'Ver tus recordatorios',
            despuesDeCerrar: true,
            alElegir: () => {
              todos.abrir('recordatorios')
            },
          },
        ]}
      />
    </div>
  )
}

// El bloque «Seguimiento» de la ficha, en una columna: el título con su «+» y su «⋯», tu recordatorio más próximo (con «Completar»; sin
// pendientes no se dibuja) y los últimos seguimientos en línea de tiempo con «Ver todos». «Ver todos» y «Ver tus recordatorios» abren la
// lista completa en un drawer (`?todos=`); con él abierto, los modales de la URL son suyos: los de acá no responden (nunca dos modales a la
// vez). Lo que manda el servidor de nuevo (tras volver a leer la ficha) se siembra sin volver a montar nada: el foco no se pierde.
export function ResumenDeSeguimientos({
  leadId,
  leadNombre,
  seguimientos: inicial,
  recordatorios,
  tipos,
}: Props) {
  const { zonaHoraria } = useRegional()
  const seguimientos = useSeguimientos(leadId, inicial)
  const todos = useTodosDeLaFicha()
  const atiendeLaUrl = todos.abierto === null
  // El próximo contacto que nace con un seguimiento: puede ser el más próximo.
  const [agendados, setAgendados] = useState<Recordatorio[]>([])
  return (
    <section aria-labelledby="seguimientos-titulo" className="grid min-w-0 gap-3">
      <TituloDelSeguimiento
        todos={todos}
        puedoAnotar={seguimientos.puedoAnotar}
        puedoAgendar={recordatorios.puedoAgendar}
        hayTipos={tipos.length > 0}
      />
      <RecordatoriosDelLead
        leadId={leadId}
        zona={zonaHoraria}
        inicial={recordatorios}
        agendados={agendados}
        forma="resumen"
        atiendeLaUrl={atiendeLaUrl}
      />
      <LineaDeSeguimientos
        leadId={leadId}
        tipos={tipos}
        zona={zonaHoraria}
        seguimientos={seguimientos}
        forma="resumen"
        atiendeLaUrl={atiendeLaUrl}
        alVerTodos={() => {
          todos.abrir('seguimientos')
        }}
        alAgendar={(recordatorio) => {
          setAgendados((antes) => [...antes, recordatorio])
        }}
      />
      <DrawerDeTodos leadId={leadId} leadNombre={leadNombre} todos={todos} />
    </section>
  )
}
