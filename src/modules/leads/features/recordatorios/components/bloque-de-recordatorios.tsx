'use client'

import { useRef } from 'react'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { PRIMEROS_DE_RECORDATORIOS } from '../../../entities/bloques-de-la-ficha'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useBusquedaDeRecordatorio } from '../hooks/use-busqueda-de-recordatorio'
import { useModalDeRecordatorio } from '../hooks/use-modal-de-recordatorio'
import type { Recordatorios } from '../hooks/use-recordatorios'
import { CompletadosPlegados } from './completados-plegados'
import { ModalDeRecordatorioDiferido } from './diferidos'
import { EsqueletoDeRecordatorios } from './esqueleto-de-recordatorios'
import { ListaDeRecordatorios } from './lista-de-recordatorios'

export type FormaDelBloque = {
  // Dentro del drawer «Ver todos»: sin botón a quien volver, el modal no devuelve el foco a ciegas (4-58, como `LineaDeSeguimientos`).
  enDrawer?: boolean
  // «resumen» (el bloque de la ficha): los pendientes más próximos (`PRIMEROS_DE_RECORDATORIOS`), sin «Ver más» ni «Completados», y «Ver
  // todos tus recordatorios» si hay más o hay completados. «completa» («Ver todos»): todo.
  forma?: 'completa' | 'resumen'
  alVerTodos?: () => void
  // Falso: otro dueño de los modales responde a la URL (el drawer «Ver todos» abierto encima del resumen).
  atiendeLaUrl?: boolean
}

type Props = FormaDelBloque & {
  leadId: string
  zona: string
  // `useRecordatorios(leadId)`: lo llama quien monta el bloque (la ficha le pone ahí el recordatorio
  // que nace con un seguimiento).
  recordatorios: Recordatorios
}

// Los pendientes: lo que hay, el vacío o el error de la primera lectura.
function Pendientes({
  ahora,
  zona,
  recordatorios,
  alEditar,
  tope,
}: {
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
  // En el resumen: cuántos se dibujan, sin «Ver más».
  tope?: number
}) {
  const { estado, listas } = recordatorios
  if (estado === 'cargando') {
    return <EsqueletoDeRecordatorios etiqueta="Cargando los recordatorios" />
  }
  if (estado === 'error') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudieron cargar los recordatorios.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={recordatorios.reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (listas.pendientes.lista.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Ningún recordatorio pendiente sobre este lead.
      </p>
    )
  }
  return (
    <ListaDeRecordatorios
      lista={tope === undefined ? listas.pendientes.lista : listas.pendientes.lista.slice(0, tope)}
      hayMas={tope === undefined && listas.pendientes.hayMas}
      ahora={ahora}
      zona={zona}
      recordatorios={recordatorios}
      alEditar={alEditar}
      verMas={recordatorios.verMasPendientes}
      cargandoMas={recordatorios.cargandoMas === 'pendientes'}
      textoDelTope={`Mostrando los primeros ${String(TOPE_DE_LO_CARGADO)}.`}
    />
  )
}

// «Ver todos tus recordatorios», sin número: si hay pendientes que no se ven o hay completados.
function hayParaVerTodos(recordatorios: Recordatorios): boolean {
  const { pendientes, hayCompletados } = recordatorios.listas
  return (
    recordatorios.estado === 'listo' &&
    (pendientes.hayMas || pendientes.lista.length > PRIMEROS_DE_RECORDATORIOS || hayCompletados)
  )
}

// Debajo de los pendientes: en el resumen, «Ver todos tus recordatorios»; en la lista completa, «Completados» plegados.
function PieDelBloque({
  resumen,
  alVerTodos,
  ahora,
  zona,
  recordatorios,
  alEditar,
}: {
  resumen: boolean
  alVerTodos: (() => void) | undefined
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
}) {
  if (!resumen) {
    return (
      <CompletadosPlegados
        ahora={ahora}
        zona={zona}
        recordatorios={recordatorios}
        alEditar={alEditar}
      />
    )
  }
  if (!alVerTodos || !hayParaVerTodos(recordatorios)) {
    return null
  }
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 w-fit md:min-h-9"
      onClick={alVerTodos}
    >
      Ver todos tus recordatorios
    </Button>
  )
}

// El modal de agendar y editar según la URL, sobre todo lo cargado (pendientes, completados y los leídos por su id).
function useModalDelBloque(recordatorios: Recordatorios, atiendeLaUrl: boolean | undefined) {
  const { pendientes, completados } = recordatorios.listas
  const cargados = [...pendientes.lista, ...(completados?.lista ?? []), ...recordatorios.sueltos]
  const buscando = useBusquedaDeRecordatorio({
    estado: recordatorios.estado,
    cargados,
    buscar: recordatorios.buscar,
    atiendeLaUrl,
  })
  return useModalDeRecordatorio({
    lista: cargados,
    puedeAgendar: recordatorios.puedoAgendar,
    buscando,
    atiendeLaUrl,
  })
}

// «Tus recordatorios» de este lead (el resumen del bloque de la ficha y «Ver todos»): «Agendar» arriba,
// los pendientes —los vencidos primero, marcados— por páginas y, plegados, los completados, que se
// leen al abrirse. Son personales: nadie más los ve. Agendar y editar abren un modal con su URL
// (`?panel=agendar-recordatorio`, `?panel=editar-recordatorio&recordatorio=<id>`); uno de la URL que
// no está cargado se lee por su id antes de decir que no está.
export function BloqueDeRecordatorios({
  leadId,
  zona,
  recordatorios,
  enDrawer,
  forma,
  alVerTodos,
  atiendeLaUrl,
}: Props) {
  const botonAgendar = useRef<HTMLButtonElement>(null)
  const resumen = forma === 'resumen'
  const modal = useModalDelBloque(recordatorios, atiendeLaUrl)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const ahora = new Date().toISOString()
  const Titulo = resumen ? 'h3' : 'h2'
  return (
    <section aria-label="Tus recordatorios" className="grid content-start gap-2">
      <Titulo className="text-(length:--text-sm) font-semibold text-(--color-ink)">
        Tus recordatorios
      </Titulo>
      {recordatorios.puedoAgendar ? (
        <Button
          ref={botonAgendar}
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-8"
          onClick={modal.abrirAgendar}
        >
          Agendar recordatorio
        </Button>
      ) : null}
      <Pendientes
        ahora={ahora}
        zona={zona}
        recordatorios={recordatorios}
        alEditar={modal.abrirEdicion}
        tope={resumen ? PRIMEROS_DE_RECORDATORIOS : undefined}
      />
      <PieDelBloque
        resumen={resumen}
        alVerTodos={alVerTodos}
        ahora={ahora}
        zona={zona}
        recordatorios={recordatorios}
        alEditar={modal.abrirEdicion}
      />
      {montar ? (
        <ModalDeRecordatorioDiferido
          key={modal.llave}
          abierto={modal.abierto}
          alCerrar={modal.cerrar}
          leadId={leadId}
          zona={zona}
          original={modal.original}
          noDisponible={modal.noDisponible}
          alGuardar={(guardado) => {
            recordatorios.poner(guardado)
            modal.cerrar()
          }}
          focoAlCerrar={() => modal.focoAlCerrar() ?? botonAgendar.current ?? !enDrawer}
          // «Recargar» tras un conflicto: sólo ése, por su id.
          alRecargar={() => {
            if (modal.original) {
              void recordatorios.recargarUno(modal.original.id)
            }
          }}
        />
      ) : null}
    </section>
  )
}
