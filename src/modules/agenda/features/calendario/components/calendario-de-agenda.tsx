import type { ReactNode } from 'react'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  CLASES_DE_AGENDA,
  entradasDeAgenda,
  type AgendaDeRango,
  type ClaveDeClase,
  type EntradaDeAgenda,
} from '../../../entities/agenda'
import { tituloDelRango, type Vista } from '../../../entities/calendario'
import { enlaceDeDia, extraDeEnlaces } from '../enlace-de-dia'
import { enlaceDePanel } from '../enlace-de-panel'
import { AvisosDeTopeDelCalendario } from './avisos-de-tope-del-calendario'
import { BarraDelCalendario } from './barra-del-calendario'
import { HojaDelDia } from './hoja-del-dia'
import { VistaDeMes } from './vista-de-mes'
import { VistaDeSemana } from './vista-de-semana'

type Props = {
  agenda: AgendaDeRango
  vista: Vista
  // El día que ancla la vista, `YYYY-MM-DD`, y el de hoy: ambos en la zona de la empresa (nunca un `Date`).
  fecha: string
  hoy: string
  zona: string
  // El instante en que se dibujó la pantalla (ISO): la marca de «ahora» de la hoja del día.
  ahora: string
  clases: readonly ClaveDeClase[]
  puedeVerTodo: boolean
  deTodos: boolean
  // «Nuevo» (lo compone `src/app`) y su copia sin atajo para el día vacío.
  nuevo: ReactNode
  nuevoDelDiaVacio: ReactNode
  // La columna de pendientes (con su `<Suspense>`); nula si «Qué ver» no pide tareas ni recordatorios.
  pendientes: ReactNode | null
}

function VacioDelDia({
  fecha,
  hoy,
  hayAlgo,
  nuevo,
}: {
  fecha: string
  hoy: string
  hayAlgo: boolean
  nuevo: ReactNode
}) {
  const titulo = hayAlgo
    ? 'Nada de lo que elegiste ver este día.'
    : fecha === hoy
      ? 'Nada agendado hoy.'
      : 'Nada agendado este día.'
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-(--color-paper-dim) px-3 py-2">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">{titulo}</p>
      {nuevo}
    </div>
  )
}

type PropsDeLaVista = {
  vista: Vista
  fecha: string
  hoy: string
  zona: string
  ahora: string
  entradas: EntradaDeAgenda[]
  hayMas: boolean
  hayAlgo: boolean
  extra: string
  nuevoDelDiaVacio: ReactNode
}

// La vista elegida: la hoja del día (con su vacío arriba, sin perder las horas), la semana o el mes (con su vacío en lugar de la grilla).
function LaVista({ vista, entradas, hayAlgo, ...props }: PropsDeLaVista) {
  const { fecha, hoy, zona, hayMas, extra } = props
  if (vista === 'dia') {
    return (
      <>
        {entradas.length === 0 ? (
          <VacioDelDia fecha={fecha} hoy={hoy} hayAlgo={hayAlgo} nuevo={props.nuevoDelDiaVacio} />
        ) : null}
        <HojaDelDia fecha={fecha} entradas={entradas} zona={zona} ahora={props.ahora} />
      </>
    )
  }
  if (entradas.length === 0) {
    return (
      <EstadoVacio
        titulo="Nada agendado en este rango."
        descripcion={
          hayAlgo
            ? 'Ninguna clase seleccionada tiene cosas en este rango.'
            : 'Cambia la vista o las clases en «Vista y opciones».'
        }
      />
    )
  }
  const Grilla = vista === 'mes' ? VistaDeMes : VistaDeSemana
  return (
    <Grilla fecha={fecha} entradas={entradas} zona={zona} hoy={hoy} hayMas={hayMas} extra={extra} />
  )
}

// La agenda como libreta: la barra, la vista elegida (la hoja del día por defecto; semana o mes a un clic), los avisos de tope y los pendientes de quien mira,
// al costado de la hoja (debajo en el celular, y debajo de la semana y el mes). Un Server Component: la barra, la hoja y las vistas son las islas de cliente.
export function CalendarioDeAgenda(props: Props) {
  const { agenda, vista, fecha, hoy, zona, clases, deTodos, pendientes } = props
  const extra = extraDeEnlaces(clases, deTodos)
  // El evento, la tarea y el recordatorio abren su panel en esta misma vista y fecha (la subasta lleva a su vehículo).
  const entradas = entradasDeAgenda(agenda, clases, (clave, id) =>
    clave === 'subasta' ? null : enlaceDePanel({ vista, fecha, extra }, clave, id),
  )
  const hayAlgo =
    entradasDeAgenda(
      agenda,
      CLASES_DE_AGENDA.map((clase) => clase.clave),
    ).length > 0
  const alCostado = vista === 'dia' && pendientes !== null
  return (
    <div className="@container/agenda grid grid-cols-[minmax(0,1fr)] gap-4">
      <BarraDelCalendario
        vista={vista}
        fecha={fecha}
        titulo={tituloDelRango(vista, fecha)}
        zona={zona}
        clases={clases}
        puedeVerTodo={props.puedeVerTodo}
        deTodos={deTodos}
        nuevo={props.nuevo}
      />
      <div
        className={
          alCostado
            ? 'grid grid-cols-[minmax(0,1fr)] items-start gap-6 @3xl/agenda:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'
            : 'grid grid-cols-[minmax(0,1fr)] gap-6'
        }
      >
        <div className="grid min-w-0 gap-4">
          <LaVista
            vista={vista}
            fecha={fecha}
            hoy={hoy}
            zona={zona}
            ahora={props.ahora}
            entradas={entradas}
            hayMas={clases.some((clave) => agenda.hayMas[clave])}
            hayAlgo={hayAlgo}
            extra={extra}
            nuevoDelDiaVacio={props.nuevoDelDiaVacio}
          />
          <AvisosDeTopeDelCalendario
            hayMas={agenda.hayMas}
            clases={clases}
            deTodos={deTodos}
            enlaceDelDia={vista === 'dia' ? null : enlaceDeDia(extra, fecha)}
          />
        </div>
        {pendientes}
      </div>
    </div>
  )
}
