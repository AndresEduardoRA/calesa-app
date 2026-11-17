'use client'

import { useState } from 'react'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques'
import { useRegional } from '@/shared/ui/regional'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { PaginaDeRecordatorios } from '../../../entities/pagina-de-recordatorios'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { PaginaDeSeguimientos } from '../../../entities/seguimiento'
import { RecordatoriosDelLead } from '../../recordatorios/components/recordatorios-del-lead'
import { useSeguimientos } from '../hooks/use-seguimientos'
import { useTodosDeLaFicha } from '../hooks/use-todos-de-la-ficha'
import { DrawerDeTodos } from './drawer-de-todos'
import { LineaDeSeguimientos } from './linea-de-seguimientos'

type Props = {
  leadId: string
  leadNombre: string
  seguimientos: PaginaDeSeguimientos
  recordatorios: PaginaDeRecordatorios
  tipos: readonly TipoDeSeguimiento[]
}

// El bloque «Seguimientos y recordatorios» de la ficha: lo último y lo próximo. A un lado los últimos seguimientos con «Anotar
// seguimiento»; al otro, tus recordatorios pendientes más próximos con «Agendar recordatorio» (dos columnas desde 36 rem de contenedor).
// Cada lado ofrece «Ver todos», que abre la lista completa en un drawer (`?todos=`). Con ese drawer abierto, los modales de la URL son
// suyos: los de acá no responden (nunca dos modales a la vez). Lo que manda el servidor de nuevo (tras volver a leer la ficha) se siembra
// sin volver a montar nada: el foco no se pierde.
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
  // El próximo contacto que nace con un seguimiento: va a «Tus recordatorios».
  const [agendados, setAgendados] = useState<Recordatorio[]>([])
  return (
    <section
      aria-labelledby="seguimientos-titulo"
      className="@container/resumen grid min-w-0 gap-4"
    >
      <h2 id="seguimientos-titulo" className={TITULO_DE_BLOQUE}>
        Seguimientos y recordatorios
      </h2>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 @[36rem]/resumen:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
        <RecordatoriosDelLead
          leadId={leadId}
          zona={zonaHoraria}
          inicial={recordatorios}
          agendados={agendados}
          forma="resumen"
          atiendeLaUrl={atiendeLaUrl}
          alVerTodos={() => {
            todos.abrir('recordatorios')
          }}
        />
      </div>
      <DrawerDeTodos leadId={leadId} leadNombre={leadNombre} todos={todos} />
    </section>
  )
}
