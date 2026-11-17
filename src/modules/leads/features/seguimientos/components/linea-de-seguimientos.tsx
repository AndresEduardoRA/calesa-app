'use client'

import { MessageSquareTextIcon } from 'lucide-react'
import { useRef, useSyncExternalStore, type RefObject } from 'react'
import { leerBorradorDeEstado } from '@/shared/lib/borrador'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import {
  claveDelBorradorDeSeguimiento,
  MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO,
} from '../../../entities/edicion-de-seguimiento'
import { PRIMEROS_DE_SEGUIMIENTOS } from '../../../entities/bloques-de-la-ficha'
import type { Recordatorio } from '../../../entities/recordatorios'
import { puedeEditarSeguimiento } from '../../../entities/seguimiento'
import { useEliminarSeguimiento } from '../hooks/use-eliminar-seguimiento'
import { useModalDeSeguimiento } from '../hooks/use-modal-de-seguimiento'
import type { Seguimientos } from '../hooks/use-seguimientos'
import { DesdeUnaFechaDiferido, ModalDeSeguimientoDiferido } from './diferidos'
import { ItemDeSeguimiento } from './item-de-seguimiento'
import { PieDeLaLinea } from './pie-de-la-linea'

type Props = {
  leadId: string
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  seguimientos: Seguimientos
  // El próximo contacto que entró con un seguimiento: va a «Tus recordatorios» si están a la vista (en
  // el drawer viven en su pestaña, que lo lee al abrirse).
  alAgendar?: (recordatorio: Recordatorio) => void
  // Dentro del drawer «Ver todos»: si al cerrarse el modal el drawer ya no está (un «atrás»), no devuelve el foco a ciegas y lo deja a la
  // vuelta del foco (4-58).
  enDrawer?: boolean
  // «resumen» (el bloque de la ficha): los últimos `PRIMEROS_DE_SEGUIMIENTOS`, sin «Ver más» ni «Ir a una fecha», y «Ver todos los
  // seguimientos» si hay más. «completa» (el drawer): toda la línea de tiempo.
  forma?: 'completa' | 'resumen'
  alVerTodos?: () => void
  // Falso: otro dueño de los modales responde a la URL (el drawer «Ver todos» abierto encima del resumen).
  atiendeLaUrl?: boolean
}

const sinSuscripcion = () => () => undefined

// ¿Quedó algo escrito sin guardar al anotar? (se cerró con «atrás», o se recargó y no se reabrió). El
// servidor no tiene el almacenamiento de la pestaña: allá es «no».
function useHayBorrador(leadId: string): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => {
      try {
        return (
          leerBorradorDeEstado(
            window.sessionStorage,
            claveDelBorradorDeSeguimiento(leadId, null),
          ) !== null
        )
      } catch {
        return false
      }
    },
    () => false,
  )
}

// «Anotar seguimiento» o, con un borrador, «Tienes un seguimiento sin guardar» con «Continuar»: no se
// abre solo. Sin tipos activos, el botón se apaga y dice por qué.
function Anotar({
  boton,
  sinTipos,
  conBorrador,
  alAbrir,
}: {
  boton: RefObject<HTMLButtonElement | null>
  sinTipos: boolean
  conBorrador: boolean
  alAbrir: () => void
}) {
  if (conBorrador && !sinTipos) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          Tienes un seguimiento sin guardar.
        </p>
        <Button ref={boton} type="button" className="min-h-11 md:min-h-9" onClick={alAbrir}>
          Continuar
        </Button>
      </div>
    )
  }
  return (
    <div className="grid gap-1">
      <Button
        ref={boton}
        type="button"
        className="min-h-11 w-fit md:min-h-9"
        onClick={alAbrir}
        disabled={sinTipos}
        aria-describedby={sinTipos ? 'seguimiento-sin-tipos' : undefined}
      >
        Anotar seguimiento
      </Button>
      {sinTipos ? (
        <p id="seguimiento-sin-tipos" className="text-(length:--text-sm) text-(--color-ink-faint)">
          {MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO}
        </p>
      ) : null}
    </div>
  )
}

// Los seguimientos (hasta `tope`, en el resumen), o el vacío. Editar y eliminar, sólo lo propio con la cartera.
function Lista({
  seguimientos,
  zona,
  alEditar,
  eliminacion,
  tope,
}: {
  seguimientos: Seguimientos
  zona: string
  alEditar: (id: string) => void
  eliminacion: ReturnType<typeof useEliminarSeguimiento>
  tope?: number
}) {
  const { puedoAnotar } = seguimientos
  const lista = tope === undefined ? seguimientos.lista : seguimientos.lista.slice(0, tope)
  if (seguimientos.lista.length === 0 && seguimientos.desde !== null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        No hay seguimientos hasta esa fecha.
      </p>
    )
  }
  if (seguimientos.lista.length === 0) {
    return (
      <EstadoVacio
        compacto
        Icono={MessageSquareTextIcon}
        titulo="Todavía no hay seguimientos"
        descripcion={
          puedoAnotar
            ? 'Cada contacto con este lead queda acá. Anota el primero.'
            : 'Cada contacto con este lead queda acá.'
        }
      />
    )
  }
  return (
    <ol className="grid gap-2">
      {lista.map((s) => (
        // Fuera de la vista no se dibuja: cargar 500 no cuesta 500 dibujos.
        <li key={s.id} className="[contain-intrinsic-size:auto_9rem] [content-visibility:auto]">
          <ItemDeSeguimiento
            seguimiento={s}
            zona={zona}
            editable={puedeEditarSeguimiento(s, puedoAnotar)}
            enCurso={eliminacion.enCurso}
            alEditar={() => {
              alEditar(s.id)
            }}
            alEliminar={() => void eliminacion.eliminar(s)}
          />
        </li>
      ))}
    </ol>
  )
}

const SUBTITULO = 'text-(length:--text-sm) font-semibold text-(--color-ink)'

// Debajo de la lista: en el resumen, «Ver todos los seguimientos»; en la línea completa, «Ver más» e «Ir a una fecha».
function PieDeLaForma({
  resumen,
  seguimientos,
  zona,
  alVerTodos,
}: {
  resumen: boolean
  seguimientos: Seguimientos
  zona: string
  alVerTodos: (() => void) | undefined
}) {
  if (!resumen) {
    return <PieDeLaLinea seguimientos={seguimientos} zona={zona} />
  }
  return alVerTodos ? <VerTodos seguimientos={seguimientos} alVerTodos={alVerTodos} /> : null
}

// El pie del resumen: «Ver todos los seguimientos», sin número (contarlos insinuaría los privados de otros), si hay más de los que se ven.
function VerTodos({
  seguimientos,
  alVerTodos,
}: {
  seguimientos: Seguimientos
  alVerTodos: () => void
}) {
  if (!seguimientos.hayMas && seguimientos.lista.length <= PRIMEROS_DE_SEGUIMIENTOS) {
    return null
  }
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 w-fit md:min-h-9"
      onClick={alVerTodos}
    >
      Ver todos los seguimientos
    </Button>
  )
}

// La línea de tiempo de un lead, más recientes primero: «Anotar», los seguimientos (editar y eliminar
// lo propio), «Ver más» hasta el tope e «Ir a una fecha». Anotar y editar abren el modal con su URL. Lo que cada quien ve lo decidió la
// base; acá no se cuenta nada, para no insinuar los privados de otros. La usan el resumen del bloque de la ficha (`forma="resumen"`) y
// «Ver todos» (el modal se dibuja adentro del drawer: Base UI lo anida).
export function LineaDeSeguimientos({
  leadId,
  tipos,
  zona,
  seguimientos,
  alAgendar,
  enDrawer = false,
  forma,
  alVerTodos,
  atiendeLaUrl,
}: Props) {
  const boton = useRef<HTMLButtonElement>(null)
  const { puedoAnotar } = seguimientos
  const resumen = forma === 'resumen'
  const eliminacion = useEliminarSeguimiento(seguimientos.poner)
  const modal = useModalDeSeguimiento({ seguimientos, hayTipos: tipos.length > 0, atiendeLaUrl })
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const conBorrador = useHayBorrador(leadId) && puedoAnotar && !modal.abierto
  return (
    <section aria-label="Seguimientos" className="grid min-w-0 content-start gap-3">
      {resumen ? <h3 className={SUBTITULO}>Últimos seguimientos</h3> : null}
      {puedoAnotar ? (
        <Anotar
          boton={boton}
          sinTipos={tipos.length === 0}
          conBorrador={conBorrador}
          alAbrir={modal.abrirAnotar}
        />
      ) : null}
      {!resumen && seguimientos.desde !== null ? (
        <DesdeUnaFechaDiferido
          dia={seguimientos.desde}
          zona={zona}
          ocupado={seguimientos.cargando}
          volver="Volver a los más recientes"
          alVolver={() => void seguimientos.volverAlPrincipio()}
        />
      ) : null}
      <Lista
        seguimientos={seguimientos}
        zona={zona}
        alEditar={modal.abrirEdicion}
        eliminacion={eliminacion}
        tope={resumen ? PRIMEROS_DE_SEGUIMIENTOS : undefined}
      />
      <PieDeLaForma
        resumen={resumen}
        seguimientos={seguimientos}
        zona={zona}
        alVerTodos={alVerTodos}
      />
      {montar ? (
        <ModalDeSeguimientoDiferido
          key={modal.llave}
          abierto={modal.abierto}
          alCerrar={modal.cerrar}
          leadId={leadId}
          tipos={tipos}
          zona={zona}
          original={modal.original}
          noDisponible={modal.noDisponible}
          alGuardar={(guardado, recordatorio) => {
            seguimientos.poner(guardado)
            if (recordatorio) {
              alAgendar?.(recordatorio)
            }
            modal.cerrar()
          }}
          focoAlCerrar={() => modal.focoAlCerrar() ?? boton.current ?? !enDrawer}
          // «Recargar» tras un conflicto: la primera página y, si no vino ahí, el que se edita por su id.
          recargar={() => void seguimientos.releer(modal.original?.id ?? null)}
          recargando={seguimientos.cargando}
        />
      ) : null}
    </section>
  )
}
