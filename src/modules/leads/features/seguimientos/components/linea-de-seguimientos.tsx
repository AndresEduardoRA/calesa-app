'use client'

import { useRef } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import { PRIMEROS_DE_SEGUIMIENTOS } from '../../../entities/bloques-de-la-ficha'
import type { Recordatorio } from '../../../entities/recordatorios'
import { useEliminarSeguimiento } from '../hooks/use-eliminar-seguimiento'
import { useModalDeSeguimiento } from '../hooks/use-modal-de-seguimiento'
import type { Seguimientos } from '../hooks/use-seguimientos'
import { AnotarOContinuar, useHayBorrador } from './aviso-de-borrador'
import { DesdeUnaFechaDiferido, ModalDeSeguimientoDiferido } from './diferidos'
import { ListaDeSeguimientos } from './lista-de-seguimientos'
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
  // «resumen» (el bloque «Seguimiento» de la ficha): los últimos `PRIMEROS_DE_SEGUIMIENTOS` en la línea de tiempo compacta, sin «Anotar» (está
  // en el «+» del título), sin «Ver más» ni «Ir a una fecha», y «Ver todos» si hay más. «completa» (el drawer): toda la línea de tiempo.
  forma?: 'completa' | 'resumen'
  alVerTodos?: () => void
  // Falso: otro dueño de los modales responde a la URL (el drawer «Ver todos» abierto encima del resumen).
  atiendeLaUrl?: boolean
}

// En el bloque no hay «Anotar» a la vista (el «Continuar» del borrador se va al guardar): el foco vuelve al «+» del título.
const focoDelMas = (resumen: boolean) =>
  resumen ? document.querySelector<HTMLElement>('[data-mas-del-seguimiento]') : null

// Debajo de la lista: en el resumen, «Ver todos»; en la línea completa, «Ver más» e «Ir a una fecha».
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

// El pie del resumen: «Ver todos», un enlace de texto sin número (contarlos insinuaría los privados de otros), si hay más de los que se ven.
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
    <button
      type="button"
      className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) font-medium text-(--color-primario) underline-offset-2 hover:underline md:min-h-8"
      onClick={alVerTodos}
    >
      Ver todos
    </button>
  )
}

// La línea de tiempo de un lead, más recientes primero: «Anotar» (en el resumen, sólo el aviso del borrador), los seguimientos (editar y
// eliminar lo propio), «Ver más» hasta el tope e «Ir a una fecha». Anotar y editar abren el modal con su URL. Lo que cada quien ve lo decidió
// la base; acá no se cuenta nada, para no insinuar los privados de otros. La usan el bloque «Seguimiento» de la ficha (`forma="resumen"`) y
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
      {puedoAnotar ? (
        <AnotarOContinuar
          boton={boton}
          sinTipos={tipos.length === 0}
          conBorrador={conBorrador}
          soloBorrador={resumen}
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
      <ListaDeSeguimientos
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
          focoAlCerrar={() =>
            modal.focoAlCerrar() ?? boton.current ?? focoDelMas(resumen) ?? !enDrawer
          }
          // «Recargar» tras un conflicto: la primera página y, si no vino ahí, el que se edita por su id.
          recargar={() => void seguimientos.releer(modal.original?.id ?? null)}
          recargando={seguimientos.cargando}
        />
      ) : null}
    </section>
  )
}
