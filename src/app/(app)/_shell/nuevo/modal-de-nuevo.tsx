'use client'

import { useRef, useState } from 'react'
import { ElegirLead } from '@/modules/buscador/shell.client'
import { rutaDeAccionSobreUnLead } from '@/modules/leads/shell.client'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import {
  CATALOGO_DE_NUEVO,
  type ClaveDeNuevo,
  type DestinoDeNuevo,
  type GrupoDeNuevo,
} from './catalogo'
import { ListaDeOpciones } from './lista-de-opciones'

type AccionSobreUnLead = Extract<DestinoDeNuevo, { tipo: 'elegir-lead' }>['accion']

export type PropsDelModalDeNuevo = {
  abierto: boolean
  alCerrar: () => void
  // Ya filtradas por grupo (`delGrupo`).
  opciones: readonly ClaveDeNuevo[]
  // `agenda`: lo abrió «Nuevo» de la agenda (sólo lo que se agenda).
  grupo: GrupoDeNuevo
  // Elegir una opción que no necesita más datos: quien lo monta cierra, abre el drawer o navega.
  alElegir: (clave: ClaveDeNuevo) => void
  alAdelantar: (clave: ClaveDeNuevo) => void
  // Elegido el lead de un seguimiento o un recordatorio.
  // El primer instante tras abrir con un clic: el clic afuera no cierra (un doble clic en el botón).
  recienAbierto: boolean
  alIrA: (ruta: string) => void
}

const TEXTOS_DEL_PASO: Record<AccionSobreUnLead, { titulo: string; descripcion: string }> = {
  'anotar-seguimiento': {
    titulo: 'Anotar seguimiento',
    descripcion: '¿A cuál de tus leads?',
  },
  'agendar-recordatorio': {
    titulo: 'Agendar recordatorio',
    descripcion: '¿Sobre cuál de tus leads?',
  },
}

// «Nuevo» de la barra superior: lo que quien mira puede crear. Una opción abre su puerta (el drawer del lead, una pantalla con su panel) y el modal se va; seguimiento
// y recordatorio piden elegir antes un lead de la cartera, en un segundo paso del mismo modal (nunca otro modal encima). «Atrás» vuelve a la lista; Esc, la ✕ y el clic
// afuera lo cierran. El foco abre en la primera opción (Lead): Enter la elige.
export function ModalDeNuevo({
  abierto,
  alCerrar,
  opciones,
  grupo,
  alElegir,
  alAdelantar,
  recienAbierto,
  alIrA,
}: PropsDelModalDeNuevo) {
  const primero = useRef<HTMLButtonElement>(null)
  const [paso, setPaso] = useState<AccionSobreUnLead | null>(null)
  const textos = paso ? TEXTOS_DEL_PASO[paso] : null

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={textos?.titulo ?? 'Nuevo'}
      descripcion={
        textos?.descripcion ??
        (grupo === 'agenda' ? '¿Qué quieres agendar?' : '¿Qué quieres crear?')
      }
      focoInicial={paso ? undefined : primero}
      sinCierreAfuera={recienAbierto}
      alTerminarDeCerrar={() => {
        setPaso(null)
      }}
      pie={
        paso ? (
          <Button
            variant="ghost"
            onClick={() => {
              setPaso(null)
            }}
          >
            Atrás
          </Button>
        ) : undefined
      }
    >
      {paso ? (
        <ElegirLead
          etiqueta="Lead"
          alElegir={(lead) => {
            alIrA(rutaDeAccionSobreUnLead(paso, lead.id))
          }}
        />
      ) : (
        <ListaDeOpciones
          opciones={opciones}
          primero={primero}
          alAdelantar={alAdelantar}
          alElegir={(clave) => {
            const destino = CATALOGO_DE_NUEVO[clave].destino
            if (destino.tipo === 'elegir-lead') {
              setPaso(destino.accion)
              return
            }
            alElegir(clave)
          }}
        />
      )}
    </Modal>
  )
}
